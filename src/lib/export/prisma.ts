/**
 * Prisma schema exporter — DatabaseAST → schema.prisma
 */
import type { DatabaseAST, SchemaField, SchemaReference } from '@/types/ast';

function toPascal(name: string): string {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toCamel(name: string): string {
  const pascal = toPascal(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function uniqueName(used: Set<string>, base: string): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let n = 2;
  while (used.has(`${base}${n}`)) n += 1;
  const next = `${base}${n}`;
  used.add(next);
  return next;
}

function prismaType(type: string): string {
  const base = type.split('(')[0].toLowerCase();
  const map: Record<string, string> = {
    uuid: 'String @db.Uuid',
    varchar: 'String',
    text: 'String',
    integer: 'Int',
    int: 'Int',
    bigint: 'BigInt',
    serial: 'Int',
    bigserial: 'BigInt',
    boolean: 'Boolean',
    bool: 'Boolean',
    timestamp: 'DateTime @db.Timestamp',
    timestamptz: 'DateTime',
    date: 'DateTime @db.Date',
    time: 'DateTime @db.Time',
    jsonb: 'Json',
    json: 'Json',
    decimal: 'Decimal @db.Decimal',
    numeric: 'Decimal',
    real: 'Float',
    float: 'Float',
    float8: 'Float',
  };
  return map[base] || 'String';
}

function prismaOnDelete(value?: string): string | null {
  switch (value) {
    case 'CASCADE':
      return 'Cascade';
    case 'SET NULL':
      return 'SetNull';
    case 'RESTRICT':
      return 'Restrict';
    case 'NO ACTION':
      return 'NoAction';
    default:
      return null;
  }
}

function fieldDirective(field: SchemaField): string {
  const parts: string[] = [];
  if (field.constraints.isPrimaryKey) parts.push('@id');
  if (field.constraints.isUnique && !field.constraints.isPrimaryKey)
    parts.push('@unique');
  if (field.constraints.isAutoincrement) {
    parts.push('@default(autoincrement())');
  } else if (field.constraints.defaultValue) {
    const value = field.constraints.defaultValue.replace(/^'|'$/g, '');
    if (value === 'now()') parts.push('@default(now())');
    else if (value === 'true' || value === 'false' || /^-?\d+(\.\d+)?$/.test(value))
      parts.push(`@default(${value})`);
    else parts.push(`@default("${value.replace(/"/g, '\\"')}")`);
  }
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

function relationName(ref: SchemaReference): string {
  return `${ref.sourceTable}_${ref.sourceField}_to_${ref.targetTable}`;
}

export function exportPrisma(ast: DatabaseAST): string {
  const tables = Object.values(ast.tables);
  const refs = Object.values(ast.references);
  const lines: string[] = [
    '// JayVis.dev — Prisma schema export',
    `// ${tables.length} model(s), ${refs.length} relation(s)`,
    '',
    'generator client {',
    '  provider = "prisma-client-js"',
    '}',
    '',
    'datasource db {',
    '  provider = "postgresql"',
    '  url      = env("DATABASE_URL")',
    '}',
    '',
  ];

  if (tables.length === 0) {
    lines.push('// empty schema');
    return lines.join('\n');
  }

  for (const table of tables) {
    if (table.fields.length === 0) continue;
    const model = toPascal(table.name) || 'Model';
    const used = new Set(table.fields.map((field) => field.name));
    const fieldLines: string[] = [];

    for (const field of table.fields) {
      const nullable =
        field.constraints.isNullable === false || field.constraints.isPrimaryKey
          ? ''
          : '?';
      fieldLines.push(
        `  ${field.name.padEnd(24)} ${prismaType(field.type)}${nullable}${fieldDirective(field)}`,
      );
    }

    for (const ref of refs) {
      if (ref.sourceTable !== table.name) continue;
      const fieldName = uniqueName(used, toCamel(ref.targetTable));
      const onDelete = prismaOnDelete(ref.onDelete);
      const deletePart = onDelete ? `, onDelete: ${onDelete}` : '';
      fieldLines.push(
        `  ${fieldName.padEnd(24)} ${toPascal(ref.targetTable)}? @relation(name: "${relationName(ref)}", fields: [${ref.sourceField}], references: [${ref.targetField}]${deletePart})`,
      );
    }

    for (const ref of refs) {
      if (ref.targetTable !== table.name) continue;
      const fieldName = uniqueName(used, toCamel(ref.sourceTable));
      fieldLines.push(
        `  ${fieldName.padEnd(24)} ${toPascal(ref.sourceTable)}[] @relation(name: "${relationName(ref)}")`,
      );
    }

    for (const index of table.indexes ?? []) {
      const cols = index.columns.join(', ');
      const map = index.name ? `, map: "${index.name}"` : '';
      fieldLines.push(
        index.isUnique
          ? `  @@unique([${cols}]${map})`
          : `  @@index([${cols}]${map})`,
      );
    }

    if (table.schema && table.schema !== 'public') {
      fieldLines.push(`  @@schema("${table.schema}")`);
    }
    fieldLines.push(`  @@map("${table.name}")`);

    lines.push(`model ${model} {`);
    lines.push(fieldLines.join('\n'));
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}
