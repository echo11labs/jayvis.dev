/**
 * PostgreSQL DDL exporter — converts a DatabaseAST into a complete
 * `CREATE TABLE` + `ALTER TABLE ... ADD CONSTRAINT` SQL script.
 */
import type { DatabaseAST, SchemaField } from '@/types/ast';
import { quoteIdent } from '@/lib/ident';

function columnToDDL(field: SchemaField): string {
  const parts: string[] = [quoteIdent(field.name), field.type];
  if (
    field.constraints.isAutoincrement &&
    (field.type === 'integer' || field.type === 'serial')
  ) {
    parts[1] = 'SERIAL';
  }
  if (
    field.constraints.isAutoincrement &&
    (field.type === 'bigint' || field.type === 'bigserial')
  ) {
    parts[1] = 'BIGSERIAL';
  }
  if (field.constraints.isPrimaryKey) parts.push('PRIMARY KEY');
  if (field.constraints.isUnique && !field.constraints.isPrimaryKey)
    parts.push('UNIQUE');
  if (field.constraints.isNullable === false && !field.constraints.isPrimaryKey)
    parts.push('NOT NULL');
  if (field.constraints.defaultValue)
    parts.push(`DEFAULT ${field.constraints.defaultValue}`);
  return parts.join(' ');
}

export function exportDDL(ast: DatabaseAST): string {
  const tables = Object.values(ast.tables);
  const refs = Object.values(ast.references);
  const lines: string[] = [
    '-- JayVis.dev schema export (PostgreSQL DDL)',
    `-- ${tables.length} table(s), ${refs.length} reference(s)`,
    '',
  ];

  if (tables.length === 0) {
    lines.push('-- empty schema');
    return lines.join('\n');
  }

  for (const table of tables) {
    if (table.fields.length === 0) {
      lines.push(`-- skipped empty table ${quoteIdent(table.name)}`);
      lines.push('');
      continue;
    }
    const schemaPrefix =
      table.schema && table.schema !== 'public'
        ? `${quoteIdent(table.schema)}.`
        : '';
    const cols = table.fields.map((field) => `  ${columnToDDL(field)}`).join(',\n');
    lines.push(`CREATE TABLE ${schemaPrefix}${quoteIdent(table.name)} (`);
    lines.push(cols);
    lines.push(');');
    lines.push('');
  }

  for (const ref of refs) {
    const constraintName = `fk_${ref.sourceTable}_${ref.sourceField}`;
    const action = [
      `ALTER TABLE ${quoteIdent(ref.sourceTable)} ADD CONSTRAINT ${quoteIdent(constraintName)}`,
      `FOREIGN KEY (${quoteIdent(ref.sourceField)}) REFERENCES ${quoteIdent(ref.targetTable)} (${quoteIdent(ref.targetField)})`,
    ];
    if (ref.onDelete) action.push(`ON DELETE ${ref.onDelete}`);
    if (ref.onUpdate) action.push(`ON UPDATE ${ref.onUpdate}`);
    lines.push(`${action.join(' ')};`);
    lines.push('');
  }

  for (const table of tables) {
    for (const index of table.indexes ?? []) {
      const cols = index.columns.map(quoteIdent).join(', ');
      const uniq = index.isUnique ? 'UNIQUE ' : '';
      const name = index.name || `idx_${table.name}_${index.columns.join('_')}`;
      lines.push(
        `CREATE ${uniq}INDEX ${quoteIdent(name)} ON ${quoteIdent(table.name)} (${cols});`,
      );
    }
  }

  return lines.join('\n').trimEnd() + '\n';
}
