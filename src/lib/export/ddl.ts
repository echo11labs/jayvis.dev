/**
 * PostgreSQL DDL exporter — converts a DatabaseAST into a complete
 * `CREATE TABLE` + `ALTER TABLE ... ADD CONSTRAINT` SQL script.
 *
 * This is the "forward" DDL (what the schema looks like as SQL), distinct
 * from the migration diff SQL (which compares two snapshots).
 */
import { DatabaseAST, SchemaField } from '@/types/ast';

function columnToDDL(f: SchemaField): string {
  const parts: string[] = [`"${f.name}"`, f.type];
  if (f.constraints.isPrimaryKey) parts.push('PRIMARY KEY');
  if (f.constraints.isUnique && !f.constraints.isPrimaryKey) parts.push('UNIQUE');
  if (f.constraints.isNullable === false && !f.constraints.isPrimaryKey)
    parts.push('NOT NULL');
  if (f.constraints.defaultValue)
    parts.push(`DEFAULT ${f.constraints.defaultValue}`);
  if (f.constraints.isAutoincrement && f.type === 'integer')
    parts[1] = 'SERIAL';
  return parts.join(' ');
}

export function exportDDL(ast: DatabaseAST): string {
  const lines: string[] = [];

  lines.push('-- StitchDB schema export (PostgreSQL DDL)');
  lines.push(`-- Generated ${new Date().toISOString()}`);
  lines.push(
    `-- ${Object.keys(ast.tables).length} table(s), ${Object.keys(ast.references).length} reference(s)`,
  );
  lines.push('');

  for (const table of Object.values(ast.tables)) {
    const schemaPrefix =
      table.schema && table.schema !== 'public' ? `"${table.schema}".` : '';
    lines.push(`CREATE TABLE ${schemaPrefix}"${table.name}" (`);

    const colLines = table.fields.map((f) => `  ${columnToDDL(f)}`);

    lines.push(colLines.join(',\n'));
    lines.push(');');
    lines.push('');
  }

  // Foreign key constraints
  for (const ref of Object.values(ast.references)) {
    const constraintName = `fk_${ref.sourceTable}_${ref.sourceField}`;
    lines.push(`ALTER TABLE "${ref.sourceTable}"`);
    lines.push(`  ADD CONSTRAINT "${constraintName}"`);
    lines.push(
      `  FOREIGN KEY ("${ref.sourceField}") REFERENCES "${ref.targetTable}" ("${ref.targetField}")`,
    );
    if (ref.onDelete) lines.push(`  ON DELETE ${ref.onDelete}`);
    if (ref.onUpdate) lines.push(`  ON UPDATE ${ref.onUpdate}`);
    lines.push('  ;');
    lines.push('');
  }

  // Index creation statements
  for (const table of Object.values(ast.tables)) {
    if (!table.indexes) continue;
    for (const idx of table.indexes) {
      const cols = idx.columns.map((c) => `"${c}"`).join(', ');
      const uniq = idx.isUnique ? 'UNIQUE ' : '';
      const name = idx.name || `idx_${table.name}_${idx.columns.join('_')}`;
      lines.push(
        `CREATE ${uniq}INDEX "${name}" ON "${table.name}" (${cols});`,
      );
    }
  }

  return lines.join('\n');
}
