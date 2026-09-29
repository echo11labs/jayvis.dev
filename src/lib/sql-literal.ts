import type { SchemaField, SchemaIndex, SchemaReference } from '@/types/ast';
import { quoteIdent } from '@/lib/ident';

export type SqlEngine = 'sqlite' | 'postgres';

export const SQL_ENGINE_KEY = 'jayvis-sql-engine';

export class SqlBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SqlBuildError';
  }
}

const KNOWN_TYPES = new Set([
  'uuid',
  'text',
  'varchar',
  'integer',
  'int',
  'bigint',
  'boolean',
  'bool',
  'timestamp',
  'timestamptz',
  'jsonb',
  'json',
  'serial',
  'bigserial',
  'decimal',
  'numeric',
  'real',
  'float',
  'float8',
  'date',
  'time',
  'interval',
]);

export function baseType(type: string): string {
  return type.split('(')[0].trim().toLowerCase();
}

export function sqlDefault(engine: SqlEngine, value: string): string {
  const trimmed = value.trim();
  const bare = trimmed.replace(/^['"]|['"]$/g, '').toLowerCase();
  if (bare === 'now()' || bare === 'current_timestamp') {
    return engine === 'sqlite' ? "(datetime('now'))" : 'CURRENT_TIMESTAMP';
  }
  if (bare === 'null') return 'NULL';
  if (bare === 'true') return engine === 'sqlite' ? '1' : 'TRUE';
  if (bare === 'false') return engine === 'sqlite' ? '0' : 'FALSE';
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed;
  if (/^'(?:[^']|'')*'$/.test(trimmed)) return trimmed;
  const literal = trimmed.replace(/^['"]|['"]$/g, '').replace(/'/g, "''");
  return `'${literal}'`;
}

export function assertExpression(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes(';') || trimmed.includes('--') || trimmed.includes('/*')) {
    throw new SqlBuildError(`${label} cannot close the statement`);
  }
  return trimmed;
}

export type StoredType = { sql: string; note: string | null };

export function storedType(
  engine: SqlEngine,
  type: string,
  column: string,
  enumNames: ReadonlySet<string> = new Set(),
): StoredType {
  const raw = type.trim();
  const base = baseType(raw);
  if (enumNames.has(raw) || enumNames.has(base)) {
    if (engine === 'postgres') return { sql: quoteIdent(raw), note: null };
    return { sql: 'TEXT', note: `${column} ${raw} stored as TEXT` };
  }
  if (!KNOWN_TYPES.has(base)) {
    throw new SqlBuildError(`Column "${column}" uses unknown type "${type}".`);
  }
  if (engine === 'postgres') {
    if (/^(varchar|decimal|numeric)\(\s*\d+\s*(,\s*\d+\s*)?\)$/i.test(raw)) {
      return { sql: raw.replace(/\s+/g, ''), note: null };
    }
    const mapped: Record<string, string> = {
      int: 'integer',
      bool: 'boolean',
      float: 'double precision',
      float8: 'double precision',
    };
    return { sql: mapped[base] ?? base, note: null };
  }
  const sqlite: Record<string, StoredType> = {
    uuid: { sql: 'TEXT', note: `${column} uuid stored as TEXT` },
    text: { sql: 'TEXT', note: null },
    varchar: { sql: 'TEXT', note: `${column} ${raw} stored as TEXT` },
    integer: { sql: 'INTEGER', note: null },
    int: { sql: 'INTEGER', note: null },
    bigint: { sql: 'INTEGER', note: `${column} bigint stored as INTEGER` },
    boolean: { sql: 'INTEGER', note: `${column} boolean stored as INTEGER` },
    bool: { sql: 'INTEGER', note: `${column} boolean stored as INTEGER` },
    timestamp: { sql: 'TEXT', note: `${column} timestamp stored as TEXT` },
    timestamptz: { sql: 'TEXT', note: `${column} timestamptz stored as TEXT` },
    jsonb: { sql: 'TEXT', note: `${column} jsonb stored as TEXT` },
    json: { sql: 'TEXT', note: `${column} json stored as TEXT` },
    date: { sql: 'TEXT', note: `${column} date stored as TEXT` },
    time: { sql: 'TEXT', note: `${column} time stored as TEXT` },
    interval: { sql: 'TEXT', note: `${column} interval stored as TEXT` },
    decimal: { sql: 'NUMERIC', note: `${column} decimal stored as NUMERIC` },
    numeric: { sql: 'NUMERIC', note: `${column} numeric stored as NUMERIC` },
    real: { sql: 'REAL', note: null },
    float: { sql: 'REAL', note: `${column} float stored as REAL` },
    float8: { sql: 'REAL', note: `${column} float8 stored as REAL` },
    serial: { sql: 'INTEGER', note: `${column} serial stored as INTEGER` },
    bigserial: { sql: 'INTEGER', note: `${column} bigserial stored as INTEGER` },
  };
  return sqlite[base];
}

export function refColumns(ref: SchemaReference, side: 'source' | 'target'): string[] {
  const many = side === 'source' ? ref.sourceFields : ref.targetFields;
  if (many && many.length > 0) return many;
  return [side === 'source' ? ref.sourceField : ref.targetField];
}

export function columnSql(
  engine: SqlEngine,
  field: SchemaField,
  enumNames: ReadonlySet<string> = new Set(),
  inlinePrimary = true,
): { sql: string; note: string | null } {
  const stored = storedType(engine, field.type, field.name, enumNames);
  const identity = field.constraints.isIdentity || field.constraints.isAutoincrement;
  let typeSql = stored.sql;
  if (engine === 'postgres' && identity && (baseType(field.type) === 'integer' || baseType(field.type) === 'serial' || baseType(field.type) === 'int')) {
    typeSql = field.constraints.isIdentity ? 'integer GENERATED BY DEFAULT AS IDENTITY' : 'SERIAL';
  }
  if (engine === 'postgres' && identity && (baseType(field.type) === 'bigint' || baseType(field.type) === 'bigserial')) {
    typeSql = field.constraints.isIdentity ? 'bigint GENERATED BY DEFAULT AS IDENTITY' : 'BIGSERIAL';
  }
  if (engine === 'sqlite' && identity && (stored.sql === 'INTEGER' || baseType(field.type) === 'integer' || baseType(field.type) === 'bigint' || baseType(field.type) === 'serial' || baseType(field.type) === 'bigserial')) {
    typeSql = 'INTEGER PRIMARY KEY AUTOINCREMENT';
  }
  const parts = [quoteIdent(field.name), typeSql];
  if (inlinePrimary && field.constraints.isPrimaryKey && !typeSql.includes('PRIMARY KEY')) {
    parts.push('PRIMARY KEY');
  }
  if (field.constraints.isUnique && !field.constraints.isPrimaryKey) parts.push('UNIQUE');
  if (field.constraints.isNullable === false && !field.constraints.isPrimaryKey && !typeSql.includes('PRIMARY KEY')) {
    parts.push('NOT NULL');
  }
  if (field.constraints.defaultValue && !identity) {
    parts.push(`DEFAULT ${sqlDefault(engine, field.constraints.defaultValue)}`);
  }
  if (field.constraints.generated) {
    const expr = assertExpression(field.constraints.generated, `Generated value on "${field.name}"`);
    parts.push(`GENERATED ALWAYS AS (${expr}) STORED`);
  }
  if (field.constraints.check) {
    parts.push(`CHECK (${assertExpression(field.constraints.check, `Check on "${field.name}"`)})`);
  }
  return { sql: parts.join(' '), note: stored.note };
}

export function indexSql(engine: SqlEngine, table: string, index: SchemaIndex): { sql: string; note: string | null } {
  const cols = index.columns.map((column) => quoteIdent(column)).join(', ');
  const unique = index.isUnique ? 'UNIQUE ' : '';
  const name = index.name || `idx_${table}_${index.columns.join('_')}`;
  let sql = `CREATE ${unique}INDEX ${quoteIdent(name)} ON ${quoteIdent(table)} (${cols})`;
  let note: string | null = null;
  if (index.method) {
    if (engine === 'postgres') sql += ` USING ${index.method.toUpperCase()}`;
    else note = `${name} index method ${index.method} is not stored on SQLite`;
  }
  if (index.where) sql += ` WHERE ${assertExpression(index.where, `Index ${name}`)}`;
  return { sql: `${sql};`, note };
}

export function foreignKeySql(engine: SqlEngine, ref: SchemaReference): string {
  const source = refColumns(ref, 'source').map((column) => quoteIdent(column)).join(', ');
  const target = refColumns(ref, 'target').map((column) => quoteIdent(column)).join(', ');
  const name = ref.name || `fk_${ref.sourceTable}_${refColumns(ref, 'source').join('_')}`;
  const parts = [
    engine === 'sqlite'
      ? `FOREIGN KEY (${source}) REFERENCES ${quoteIdent(ref.targetTable)} (${target})`
      : `ALTER TABLE ${quoteIdent(ref.sourceTable)} ADD CONSTRAINT ${quoteIdent(name)} FOREIGN KEY (${source}) REFERENCES ${quoteIdent(ref.targetTable)} (${target})`,
  ];
  if (ref.onDelete) parts.push(`ON DELETE ${ref.onDelete.toUpperCase()}`);
  if (ref.onUpdate) parts.push(`ON UPDATE ${ref.onUpdate.toUpperCase()}`);
  if (ref.deferrable) parts.push('DEFERRABLE INITIALLY DEFERRED');
  const sql = parts.join(' ');
  return engine === 'sqlite' ? sql : `${sql};`;
}

export function enumNamesOf(enums: Record<string, { name: string }> | undefined): Set<string> {
  return new Set(Object.values(enums ?? {}).map((item) => item.name));
}
