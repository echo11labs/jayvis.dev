import type { DatabaseAST, SchemaField, SchemaTable } from '@/types/ast';
import { quoteIdent } from '@/lib/ident';
import {
  assertExpression,
  columnSql,
  enumNamesOf,
  foreignKeySql,
  indexSql,
  refColumns,
  type SqlEngine,
} from '@/lib/sql-literal';

export interface BuiltStatement {
  sql: string;
  description: string;
}

export interface BuiltScript {
  statements: BuiltStatement[];
  script: string;
  notes: string[];
}

function primaryKeyColumns(table: SchemaTable): string[] {
  if (table.primaryKey && table.primaryKey.length > 0) return table.primaryKey;
  return table.fields.filter((field) => field.constraints.isPrimaryKey).map((field) => field.name);
}

function enumCheck(field: SchemaField, enums: DatabaseAST['enums']): string | null {
  const match = Object.values(enums ?? {}).find(
    (item) => item.name === field.type || item.name === field.type.split('(')[0],
  );
  if (!match) return null;
  const values = match.values
    .map((value) => `'${value.name.replace(/'/g, "''")}'`)
    .join(', ');
  return `${quoteIdent(field.name)} IN (${values})`;
}

export function buildSchemaScript(ast: DatabaseAST, engine: SqlEngine): BuiltScript {
  const enums = enumNamesOf(ast.enums);
  const notes: string[] = [];
  const statements: BuiltStatement[] = [];

  for (const item of Object.values(ast.enums ?? {})) {
    if (engine === 'postgres') {
      const values = item.values
        .map((value) => `'${value.name.replace(/'/g, "''")}'`)
        .join(', ');
      statements.push({
        sql: `CREATE TYPE ${quoteIdent(item.name)} AS ENUM (${values});`,
        description: `Create enum "${item.name}"`,
      });
    }
  }

  const fks = Object.values(ast.references);
  for (const table of Object.values(ast.tables)) {
    if (table.fields.length === 0 && !(table.primaryKey && table.primaryKey.length > 0)) {
      notes.push(`skipped empty table "${table.name}"`);
      continue;
    }
    const pk = primaryKeyColumns(table);
    const inlinePrimary = pk.length <= 1;
    const lines: string[] = [];
    for (const field of table.fields) {
      const rendered = columnSql(engine, field, enums, inlinePrimary && pk.includes(field.name));
      lines.push(`  ${rendered.sql}`);
      if (rendered.note) notes.push(rendered.note);
      if (engine === 'sqlite') {
        const check = enumCheck(field, ast.enums);
        if (check) lines.push(`  CHECK (${check})`);
      }
    }
    if (pk.length > 1) {
      lines.push(`  PRIMARY KEY (${pk.map((column) => quoteIdent(column)).join(', ')})`);
    }
    for (const unique of table.uniques ?? []) {
      const name = unique.name ? `CONSTRAINT ${quoteIdent(unique.name)} ` : '';
      lines.push(`  ${name}UNIQUE (${unique.columns.map((column) => quoteIdent(column)).join(', ')})`);
    }
    for (const check of table.checks ?? []) {
      lines.push(`  CHECK (${assertExpression(check, `Check on "${table.name}"`)})`);
    }
    if (engine === 'sqlite') {
      for (const ref of fks.filter((item) => item.sourceTable === table.name)) {
        lines.push(`  ${foreignKeySql('sqlite', ref)}`);
      }
    }
    const schemaPrefix =
      engine === 'postgres' && table.schema && table.schema !== 'public'
        ? `${quoteIdent(table.schema)}.`
        : '';
    statements.push({
      sql: `CREATE TABLE ${schemaPrefix}${quoteIdent(table.name)} (\n${lines.join(',\n')}\n);`,
      description: `Create table "${table.name}"`,
    });
  }

  if (engine === 'postgres') {
    for (const ref of fks) {
      statements.push({
        sql: foreignKeySql('postgres', ref),
        description: `Foreign key ${refColumns(ref, 'source').join(', ')} on "${ref.sourceTable}"`,
      });
    }
  }

  for (const table of Object.values(ast.tables)) {
    for (const index of table.indexes ?? []) {
      const rendered = indexSql(engine, table.name, index);
      if (rendered.note) notes.push(rendered.note);
      statements.push({
        sql: rendered.sql,
        description: `Create index on "${table.name}"`,
      });
    }
  }

  const header = [
    `-- JayVis.dev — ${engine === 'sqlite' ? 'SQLite' : 'PostgreSQL'} build`,
    `-- ${Object.keys(ast.tables).length} table(s), ${fks.length} reference(s), ${statements.length} statement(s)`,
    ...notes.map((note) => `-- ${note}`),
    '',
  ];
  if (engine === 'sqlite') {
    header.push('-- Enable foreign key support', 'PRAGMA foreign_keys = ON;', '');
  }
  const script = `${header.join('\n')}${statements.map((statement) => statement.sql).join('\n\n')}\n`;
  return { statements, script, notes };
}
