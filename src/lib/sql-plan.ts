import type { DatabaseAST, SchemaField, SchemaTable } from '@/types/ast';
import { quoteIdent } from '@/lib/ident';
import { buildSchemaScript, type BuiltStatement } from '@/lib/sql-script';
import {
  columnSql,
  foreignKeySql,
  indexSql,
  sqlDefault,
  SqlBuildError,
  storedType,
  type SqlEngine,
} from '@/lib/sql-literal';

export interface CatalogColumn {
  name: string;
  type: string;
  notNull: boolean;
  pk: boolean;
}

export interface CatalogIndex {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface CatalogForeignKey {
  columns: string[];
  refTable: string;
  refColumns: string[];
}

export interface CatalogTable {
  name: string;
  columns: CatalogColumn[];
  indexes: CatalogIndex[];
  foreignKeys: CatalogForeignKey[];
}

export interface LiveCatalog {
  tables: CatalogTable[];
}

export interface PlannedStatement extends BuiltStatement {
  destructive: boolean;
}

export interface BuildPlan {
  statements: PlannedStatement[];
  notes: string[];
  destructive: boolean;
}

function sameShape(left: SchemaField, right: CatalogColumn, engine: SqlEngine): boolean {
  const stored = storedType(engine, left.type, left.name).sql.toUpperCase();
  return stored === right.type.toUpperCase() && (left.constraints.isNullable === false) === right.notNull;
}

function sameStoredType(engine: SqlEngine, field: SchemaField, previous: string): boolean {
  const next = storedType(engine, field.type, field.name).sql.toUpperCase();
  const prior = previous.toUpperCase();
  if (next === prior) return true;
  if (prior === 'CHARACTER VARYING' && next.startsWith('VARCHAR')) return true;
  if (prior === 'TIMESTAMP WITH TIME ZONE' && next === 'TIMESTAMPTZ') return true;
  if (prior === 'INTEGER' && (next === 'INT' || next === 'SERIAL')) return true;
  return false;
}

function pairRenames(
  table: SchemaTable,
  live: CatalogTable,
  engine: SqlEngine,
): Array<{ from: string; to: string }> {
  const liveNames = new Set(live.columns.map((column) => column.name));
  const nextNames = new Set(table.fields.map((field) => field.name));
  const dropped = live.columns.filter((column) => !nextNames.has(column.name));
  const added = table.fields.filter((field) => !liveNames.has(field.name));
  if (dropped.length !== 1 || added.length !== 1) return [];
  if (!sameShape(added[0], dropped[0], engine)) return [];
  return [{ from: dropped[0].name, to: added[0].name }];
}

function requireBackfill(field: SchemaField) {
  if (field.constraints.isNullable === false && !field.constraints.defaultValue && !field.constraints.isPrimaryKey && !field.constraints.isAutoincrement && !field.constraints.isIdentity) {
    throw new SqlBuildError(
      `Column "${field.name}" is NOT NULL and needs a default before it can be added to an existing table.`,
    );
  }
}

function createTablePlan(ast: DatabaseAST, table: SchemaTable, engine: SqlEngine): PlannedStatement[] {
  const partial: DatabaseAST = {
    version: ast.version,
    tables: { [table.name]: table },
    references: Object.fromEntries(
      Object.entries(ast.references).filter(([, ref]) => ref.sourceTable === table.name || ref.targetTable === table.name),
    ),
    enums: ast.enums,
  };
  return buildSchemaScript(partial, engine).statements
    .filter((statement) => statement.sql.includes(quoteIdent(table.name)) || statement.sql.startsWith('CREATE TYPE'))
    .map((statement) => ({ ...statement, destructive: false }));
}

export function planBuild(ast: DatabaseAST, catalog: LiveCatalog, engine: SqlEngine): BuildPlan {
  const notes = buildSchemaScript(ast, engine).notes;
  if (catalog.tables.length === 0) {
    return {
      statements: buildSchemaScript(ast, engine).statements.map((statement) => ({
        ...statement,
        destructive: false,
      })),
      notes,
      destructive: false,
    };
  }
  const liveByName = new Map(catalog.tables.map((table) => [table.name, table]));
  const statements: PlannedStatement[] = [];
  let rebuild = false;

  for (const table of Object.values(ast.tables)) {
    const live = liveByName.get(table.name);
    if (!live) {
      statements.push(...createTablePlan(ast, table, engine));
      continue;
    }
    const renames = pairRenames(table, live, engine);
    const renameFrom = new Set(renames.map((item) => item.from));
    const renameTo = new Set(renames.map((item) => item.to));
    const liveNames = new Set(live.columns.map((column) => column.name));
    const nextNames = new Set(table.fields.map((field) => field.name));
    const dropped = live.columns.filter((column) => !nextNames.has(column.name) && !renameFrom.has(column.name));
    const added = table.fields.filter((field) => !liveNames.has(field.name) && !renameTo.has(field.name));
    const typeChanges = table.fields.filter((field) => {
      const previous = live.columns.find((column) => column.name === field.name);
      if (!previous) return false;
      return !sameStoredType(engine, field, previous.type);
    });
    const pkChanged = live.columns.filter((column) => column.pk).map((column) => column.name).join(',')
      !== table.fields.filter((field) => field.constraints.isPrimaryKey).map((field) => field.name).join(',');

    for (const field of added) requireBackfill(field);

    if (engine === 'sqlite' && (typeChanges.length > 0 || pkChanged)) {
      rebuild = true;
      const rendered = table.fields.map((field) => columnSql('sqlite', field).sql);
      const pk = table.fields.filter((field) => field.constraints.isPrimaryKey).map((field) => field.name);
      if (pk.length > 1) rendered.push(`PRIMARY KEY (${pk.map((column) => quoteIdent(column)).join(', ')})`);
      for (const ref of Object.values(ast.references)) {
        if (ref.sourceTable === table.name) rendered.push(foreignKeySql('sqlite', ref));
      }
      const fresh = `${table.name}__jayvis_new`;
      const insertCols = table.fields.map((field) => quoteIdent(field.name)).join(', ');
      const selectCols = table.fields.map((field) => {
        const renamed = renames.find((item) => item.to === field.name);
        const source = renamed?.from ?? (liveNames.has(field.name) ? field.name : null);
        if (!source) {
          if (!field.constraints.defaultValue) {
            throw new SqlBuildError(`Column "${field.name}" has no existing value to copy.`);
          }
          return sqlDefault(engine, field.constraints.defaultValue ?? 'NULL');
        }
        return quoteIdent(source);
      }).join(', ');
      statements.push(
        { sql: `CREATE TABLE ${quoteIdent(fresh)} (\n  ${rendered.join(',\n  ')}\n);`, description: `Rebuild "${table.name}"`, destructive: true },
        { sql: `INSERT INTO ${quoteIdent(fresh)} (${insertCols}) SELECT ${selectCols} FROM ${quoteIdent(table.name)};`, description: `Copy rows for "${table.name}"`, destructive: true },
        { sql: `DROP TABLE ${quoteIdent(table.name)};`, description: `Replace "${table.name}"`, destructive: true },
        { sql: `ALTER TABLE ${quoteIdent(fresh)} RENAME TO ${quoteIdent(table.name)};`, description: `Rename rebuilt "${table.name}"`, destructive: true },
      );
      continue;
    }

    for (const rename of renames) {
      statements.push({
        sql: `ALTER TABLE ${quoteIdent(table.name)} RENAME COLUMN ${quoteIdent(rename.from)} TO ${quoteIdent(rename.to)};`,
        description: `Rename "${rename.from}" to "${rename.to}"`,
        destructive: false,
      });
    }
    for (const column of dropped) {
      statements.push({
        sql: `ALTER TABLE ${quoteIdent(table.name)} DROP COLUMN ${quoteIdent(column.name)};`,
        description: `Drop column "${column.name}"`,
        destructive: true,
      });
    }
    for (const field of added) {
      const rendered = columnSql(engine, field).sql;
      statements.push({
        sql: `ALTER TABLE ${quoteIdent(table.name)} ADD COLUMN ${rendered};`,
        description: `Add column "${field.name}"`,
        destructive: false,
      });
    }
    for (const field of typeChanges) {
      statements.push({
        sql: `ALTER TABLE ${quoteIdent(table.name)} ALTER COLUMN ${quoteIdent(field.name)} TYPE ${storedType(engine, field.type, field.name).sql};`,
        description: `Change type of "${field.name}"`,
        destructive: true,
      });
    }
    const wantedIndexes = table.indexes ?? [];
    const liveIndexNames = new Set(live.indexes.map((index) => index.name));
    const wantedNames = new Set(
      wantedIndexes.map((index) => index.name || `idx_${table.name}_${index.columns.join('_')}`),
    );
    for (const index of live.indexes) {
      if (wantedNames.has(index.name)) continue;
      statements.push({
        sql: `DROP INDEX ${quoteIdent(index.name)};`,
        description: `Drop index "${index.name}"`,
        destructive: false,
      });
    }
    for (const index of wantedIndexes) {
      const name = index.name || `idx_${table.name}_${index.columns.join('_')}`;
      if (liveIndexNames.has(name)) continue;
      const built = indexSql(engine, table.name, index);
      statements.push({
        sql: built.sql,
        description: `Add index "${name}"`,
        destructive: false,
      });
    }
    if (engine === 'postgres') {
      const liveFk = new Set(live.foreignKeys.map((key) => `${key.columns.join(',')}:${key.refTable}`));
      for (const ref of Object.values(ast.references)) {
        if (ref.sourceTable !== table.name) continue;
        const key = `${(ref.sourceFields ?? [ref.sourceField]).join(',')}:${ref.targetTable}`;
        if (liveFk.has(key)) continue;
        statements.push({
          sql: foreignKeySql('postgres', ref),
          description: `Add foreign key on "${table.name}"`,
          destructive: false,
        });
      }
    }
  }

  for (const live of catalog.tables) {
    if (!ast.tables[live.name]) {
      statements.push({
        sql: `DROP TABLE ${quoteIdent(live.name)};`,
        description: `Drop table "${live.name}"`,
        destructive: true,
      });
    }
  }

  const unique: PlannedStatement[] = [];
  const seen = new Set<string>();
  for (const statement of statements) {
    if (seen.has(statement.sql)) continue;
    seen.add(statement.sql);
    unique.push(statement);
  }
  return {
    statements: unique,
    notes,
    destructive: rebuild || unique.some((statement) => statement.destructive),
  };
}

