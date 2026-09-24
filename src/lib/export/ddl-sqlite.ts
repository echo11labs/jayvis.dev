/**
 * SQLite DDL builder — converts a DatabaseAST into SQLite-compatible
 * CREATE TABLE statements with inline foreign keys.
 *
 * SQLite differs from PostgreSQL:
 * - No SERIAL type; use `INTEGER PRIMARY KEY AUTOINCREMENT`
 * - Foreign keys are inline in CREATE TABLE, not ALTER TABLE ADD CONSTRAINT
 * - ON DELETE / ON UPDATE are part of the column or table constraint
 */
import { DatabaseAST, SchemaField } from '@/types/ast';

/** Map PostgreSQL types to SQLite-compatible types. */
function sqliteType(f: SchemaField): string {
  if (f.constraints.isAutoincrement && (f.type === 'integer' || f.type === 'bigint')) {
    return 'INTEGER PRIMARY KEY AUTOINCREMENT';
  }
  const base = f.type.split('(')[0].toLowerCase();
  const map: Record<string, string> = {
    uuid: 'TEXT',
    varchar: 'TEXT',
    text: 'TEXT',
    integer: 'INTEGER',
    int: 'INTEGER',
    bigint: 'INTEGER',
    boolean: 'INTEGER', // SQLite uses 0/1 for booleans
    bool: 'INTEGER',
    timestamp: 'TEXT', // ISO 8601 strings
    timestamptz: 'TEXT',
    date: 'TEXT',
    time: 'TEXT',
    jsonb: 'TEXT', // JSON stored as text
    json: 'TEXT',
    decimal: 'REAL',
    numeric: 'REAL',
    real: 'REAL',
    float: 'REAL',
    float8: 'REAL',
    serial: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    bigserial: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  };
  return map[base] || 'TEXT';
}

function sqliteDefault(value: string): string {
  const bare = value.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
  if (bare === 'now()' || bare === 'current_timestamp') return "(datetime('now'))";
  return value;
}

function sqlAction(value: string): string {
  return value.trim().toUpperCase();
}

function columnDef(f: SchemaField): string {
  // If autoincrement, the type already includes PRIMARY KEY AUTOINCREMENT
  if (f.constraints.isAutoincrement) {
    return `"${f.name}" ${sqliteType(f)}`;
  }

  const parts: string[] = [`"${f.name}"`, sqliteType(f)];

  if (f.constraints.isPrimaryKey) parts.push('PRIMARY KEY');
  if (f.constraints.isUnique && !f.constraints.isPrimaryKey) parts.push('UNIQUE');
  if (f.constraints.isNullable === false && !f.constraints.isPrimaryKey) parts.push('NOT NULL');
  if (f.constraints.defaultValue) {
    parts.push(`DEFAULT ${sqliteDefault(f.constraints.defaultValue)}`);
  }

  return parts.join(' ');
}

export interface SqlStatement {
  sql: string;
  description: string;
}

/**
 * Build an array of individual SQL statements from the AST.
 * Each statement is self-contained and can be executed independently.
 */
export function buildSqlStatements(ast: DatabaseAST): SqlStatement[] {
  const stmts: SqlStatement[] = [];

  // Build a lookup of foreign keys per table (source side).
  const fksByTable: Record<string, Array<{ field: string; refTable: string; refField: string; onDelete?: string; onUpdate?: string }>> = {};
  for (const ref of Object.values(ast.references)) {
    if (!fksByTable[ref.sourceTable]) fksByTable[ref.sourceTable] = [];
    fksByTable[ref.sourceTable].push({
      field: ref.sourceField,
      refTable: ref.targetTable,
      refField: ref.targetField,
      onDelete: ref.onDelete,
      onUpdate: ref.onUpdate,
    });
  }

  // CREATE TABLE statements (with inline FKs).
  for (const table of Object.values(ast.tables)) {
    const fks = fksByTable[table.name] || [];
    const colDefs = table.fields.map((f) => `  ${columnDef(f)}`);

    // Add inline FOREIGN KEY constraints
    for (const fk of fks) {
      let fkLine = `  FOREIGN KEY ("${fk.field}") REFERENCES "${fk.refTable}"("${fk.refField}")`;
      if (fk.onDelete) fkLine += ` ON DELETE ${sqlAction(fk.onDelete)}`;
      if (fk.onUpdate) fkLine += ` ON UPDATE ${sqlAction(fk.onUpdate)}`;
      colDefs.push(fkLine);
    }

    // Add indexes as table constraints (SQLite supports inline in some cases,
    // but CREATE INDEX is more standard)
    const sql = `CREATE TABLE IF NOT EXISTS "${table.name}" (\n${colDefs.join(',\n')}\n);`;
    stmts.push({ sql, description: `Create table "${table.name}"` });
  }

  // CREATE INDEX statements
  for (const table of Object.values(ast.tables)) {
    if (!table.indexes) continue;
    for (const idx of table.indexes) {
      const cols = idx.columns.map((c) => `"${c}"`).join(', ');
      const uniq = idx.isUnique ? 'UNIQUE ' : '';
      const name = idx.name || `idx_${table.name}_${idx.columns.join('_')}`;
      stmts.push({
        sql: `CREATE ${uniq}INDEX IF NOT EXISTS "${name}" ON "${table.name}" (${cols});`,
        description: `Create ${uniq ? 'unique ' : ''}index "${name}" on "${table.name}"`,
      });
    }
  }

  return stmts;
}

/**
 * Build the complete SQL script (all statements joined).
 */
export function buildSqlScript(ast: DatabaseAST): string {
  const stmts = buildSqlStatements(ast);
  const lines: string[] = [
    '-- JayVis.dev — SQL Builder output (SQLite)',
    `-- Generated ${new Date().toISOString()}`,
    `-- ${Object.keys(ast.tables).length} table(s), ${Object.keys(ast.references).length} reference(s), ${stmts.length} statement(s)`,
    '',
    '-- Enable foreign key support',
    'PRAGMA foreign_keys = ON;',
    '',
  ];
  for (const s of stmts) {
    lines.push(s.sql);
    lines.push('');
  }
  return lines.join('\n');
}
