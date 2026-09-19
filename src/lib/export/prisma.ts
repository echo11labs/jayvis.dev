/**
 * Prisma schema exporter — converts a DatabaseAST into a Prisma `schema.prisma`
 * file with `model` declarations, `@id`, `@unique`, `@default`, `@relation`
 * directives, and enum support.
 */
import { DatabaseAST, SchemaField } from '@/types/ast';

function prismaType(type: string): string {
  const base = type.split('(')[0].toLowerCase();
  const map: Record<string, string> = {
    uuid: 'String @db.Uuid',
    varchar: 'String',
    text: 'String',
    integer: 'Int',
    int: 'Int',
    bigint: 'BigInt',
    serial: 'Int @default(autoincrement())',
    bigserial: 'BigInt @default(autoincrement())',
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

function fieldDirective(f: SchemaField): string {
  const parts: string[] = [];
  if (f.constraints.isPrimaryKey) parts.push('@id');
  if (f.constraints.isUnique && !f.constraints.isPrimaryKey) parts.push('@unique');
  if (f.constraints.defaultValue) {
    const dv = f.constraints.defaultValue;
    if (dv === 'now()') {
      parts.push('@default(now())');
    } else if (dv === 'true' || dv === 'false') {
      parts.push(`@default(${dv})`);
    } else if (/^-?\d+(\.\d+)?$/.test(dv)) {
      parts.push(`@default(${dv})`);
    } else {
      parts.push(`@default(${dv})`);
    }
  }
  if (f.constraints.isAutoincrement && !parts.includes('@default(autoincrement())')) {
    parts.push('@default(autoincrement())');
  }
  if (!f.constraints.isNullable && !f.constraints.isPrimaryKey) {
    // Prisma fields are NOT NULL by default for scalars — no directive needed.
  }
  return parts.length > 0 ? ' ' + parts.join(' ') : '';
}

export function exportPrisma(ast: DatabaseAST): string {
  const lines: string[] = [];

  lines.push('// StitchDB — Prisma schema export');
  lines.push(`// Generated ${new Date().toISOString()}`);
  lines.push(`// ${Object.keys(ast.tables).length} model(s), ${Object.keys(ast.references).length} relation(s)`);
  lines.push('');
  lines.push('generator client {');
  lines.push('  provider = "prisma-client-js"');
  lines.push('}');
  lines.push('');
  lines.push('datasource db {');
  lines.push('  provider = "postgresql"');
  lines.push('  url      = env("DATABASE_URL")');
  lines.push('}');
  lines.push('');

  // Build a map of relations per table for inline @relation directives.
  const outgoingRefs: Record<string, SchemaReference[]> = {};
  for (const ref of Object.values(ast.references)) {
    if (!outgoingRefs[ref.sourceTable]) outgoingRefs[ref.sourceTable] = [];
    outgoingRefs[ref.sourceTable].push(ref);
  }

  for (const table of Object.values(ast.tables)) {
    lines.push(`model ${capitalize(table.name)} {`);

    const fieldLines: string[] = [];
    for (const f of table.fields) {
      const ptype = prismaType(f.type);
      const directive = fieldDirective(f);
      const nullable = f.constraints.isNullable === false ? '' : '?';
      fieldLines.push(`  ${f.name.padEnd(24)} ${ptype}${nullable}${directive}`);
    }

    // Add relation fields.
    const refs = outgoingRefs[table.name] || [];
    for (const ref of refs) {
      const relName = `${ref.sourceField}To${capitalize(ref.targetTable)}`;
      fieldLines.push(`  ${ref.targetTable.padEnd(24)} ${capitalize(ref.targetTable)}?    @relation(name: "${relName}", fields: [${ref.sourceField}], references: [${ref.targetField}], onDelete: ${ref.onDelete ? ref.onDelete.toLowerCase().replace(' ', ' ') : 'NoAction'})`);
    }

    // Incoming relations (the other side).
    for (const ref of Object.values(ast.references)) {
      if (ref.targetTable === table.name) {
        const fieldName = `${table.name}_to_${ref.sourceTable}`;
        fieldLines.push(`  ${ref.sourceTable.padEnd(24)} ${capitalize(ref.sourceTable)}[]   @relation("${ref.sourceField}To${capitalize(ref.targetTable)}")`);
      }
    }

    // @@map to the actual table name.
    if (table.schema && table.schema !== 'public') {
      fieldLines.push('');
      fieldLines.push(`  @@schema("${table.schema}")`);
    }
    fieldLines.push(`  @@map("${table.name}")`);

    lines.push(fieldLines.join('\n'));
    lines.push('}');
    lines.push('');
  }

  // Indexes.
  for (const table of Object.values(ast.tables)) {
    if (!table.indexes) continue;
    for (const idx of table.indexes) {
      const fields = idx.columns.join(', ');
      const name = idx.name || `idx_${table.name}_${idx.columns.join('_')}`;
      if (idx.isUnique) {
        lines.push(`// @@unique([${fields}]) on ${table.name} (index: ${name})`);
      } else {
        lines.push(`// @@index([${fields}]) on ${table.name} (index: ${name})`);
      }
    }
  }

  return lines.join('\n');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
