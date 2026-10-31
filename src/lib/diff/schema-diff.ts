/**
 * Migration diff — compares two DatabaseAST snapshots and emits
 * PostgreSQL-flavored UP/DOWN SQL (aligned with exportDDL).
 */
import type {
  DatabaseAST,
  SchemaDiffResult,
  SchemaHazard,
  TableDiff,
  ColumnDiff,
  IndexDiff,
  ReferenceDiff,
  SchemaField,
  SchemaIndex,
  SchemaReference,
  SchemaTable,
} from '@/types/ast';
import { quoteIdent } from '@/lib/ident';
import {
  assertExpression,
  columnSql,
  refColumns,
  sqlDefault,
  storedType,
  type SqlEngine,
} from '@/lib/sql-literal';

export interface SchemaDiffOptions {
  engine?: SqlEngine;
}

function q(name: string): string {
  return quoteIdent(name);
}

function columnToSql(
  engine: SqlEngine,
  field: SchemaField,
  enumNames?: ReadonlySet<string>,
): string {
  return columnSql(engine, field, enumNames).sql;
}

function createTableSql(
  engine: SqlEngine,
  name: string,
  table: SchemaTable,
  enumNames?: ReadonlySet<string>,
): string {
  const pk =
    table.primaryKey && table.primaryKey.length > 0
      ? table.primaryKey
      : table.fields.filter((field) => field.constraints.isPrimaryKey).map((field) => field.name);
  const inlinePrimary = pk.length <= 1;
  const lines: string[] = [];
  for (const field of table.fields) {
    const rendered = columnSql(
      engine,
      field,
      enumNames,
      inlinePrimary && pk.includes(field.name),
    );
    lines.push(`  ${rendered.sql}`);
  }
  if (pk.length > 1) {
    lines.push(`  PRIMARY KEY (${pk.map(q).join(', ')})`);
  }
  for (const unique of table.uniques ?? []) {
    const uName = unique.name && engine === 'postgres' ? `CONSTRAINT ${q(unique.name)} ` : '';
    lines.push(`  ${uName}UNIQUE (${unique.columns.map(q).join(', ')})`);
  }
  for (const check of table.checks ?? []) {
    lines.push(`  CHECK (${assertExpression(check, `Check on "${name}"`)})`);
  }
  const schemaPrefix =
    engine === 'postgres' && table.schema && table.schema !== 'public' ? `${q(table.schema)}.` : '';
  return `CREATE TABLE ${schemaPrefix}${q(name)} (\n${lines.join(',\n')}\n);`;
}

function indexName(tableName: string, index: SchemaIndex): string {
  return index.name || `idx_${tableName}_${index.columns.join('_')}`;
}

function indexKey(tableName: string, index: SchemaIndex): string {
  return `${indexName(tableName, index)}::${index.columns.join(',')}::${index.isUnique ? 'u' : 'i'}`;
}

function fkName(ref: SchemaReference, allRefs?: SchemaReference[]): string {
  if (ref.name) return ref.name;
  const src = refColumns(ref, 'source').join('_');
  const base = `fk_${ref.sourceTable}_${src}`;
  if (allRefs && allRefs.length > 0) {
    const collisions = allRefs.filter(
      (r) =>
        r.sourceTable === ref.sourceTable &&
        refColumns(r, 'source').join('_') === src,
    );
    if (collisions.length > 1) {
      const tgt = refColumns(ref, 'target').join('_');
      return `${base}__${ref.targetTable}_${tgt}`;
    }
  }
  return base;
}

function addFkSql(ref: SchemaReference, allRefs?: SchemaReference[], engine: SqlEngine = 'postgres'): string {
  if (engine === 'sqlite') {
    return `-- SQLite: foreign key ${ref.sourceTable}.${ref.sourceField} references ${ref.targetTable}.${ref.targetField}`;
  }
  const source = refColumns(ref, 'source').map(q).join(', ');
  const target = refColumns(ref, 'target').map(q).join(', ');
  const parts = [
    `ALTER TABLE ${q(ref.sourceTable)} ADD CONSTRAINT ${q(fkName(ref, allRefs))}`,
    `FOREIGN KEY (${source}) REFERENCES ${q(ref.targetTable)} (${target})`,
  ];
  if (ref.onDelete) parts.push(`ON DELETE ${ref.onDelete.toUpperCase()}`);
  if (ref.onUpdate) parts.push(`ON UPDATE ${ref.onUpdate.toUpperCase()}`);
  if (ref.deferrable) parts.push('DEFERRABLE INITIALLY DEFERRED');
  return `${parts.join(' ')};`;
}

function dropFkSql(ref: SchemaReference, allRefs?: SchemaReference[], engine: SqlEngine = 'postgres'): string {
  if (engine === 'sqlite') {
    return `-- SQLite: drop foreign key on ${ref.sourceTable}.${ref.sourceField}`;
  }
  return `ALTER TABLE ${q(ref.sourceTable)} DROP CONSTRAINT IF EXISTS ${q(fkName(ref, allRefs))};`;
}

function dropTableSql(engine: SqlEngine, name: string): string {
  if (engine === 'sqlite') {
    return `DROP TABLE IF EXISTS ${q(name)};`;
  }
  return `DROP TABLE IF EXISTS ${q(name)} CASCADE;`;
}

function dedupe(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    if (!line) continue;
    if (!seen.has(line)) {
      seen.add(line);
      out.push(line);
    }
  }
  return out;
}

function createIndexSql(tableName: string, index: SchemaIndex): string {
  const cols = index.columns.map(q).join(', ');
  const unique = index.isUnique ? 'UNIQUE ' : '';
  const using = index.method ? ` USING ${index.method.toUpperCase()}` : '';
  const where = index.where ? ` WHERE ${assertExpression(index.where, `Index ${indexName(tableName, index)}`)}` : '';
  return `CREATE ${unique}INDEX ${q(indexName(tableName, index))} ON ${q(tableName)} (${cols})${using}${where};`;
}

function dropIndexSql(tableName: string, index: SchemaIndex): string {
  return `DROP INDEX IF EXISTS ${q(indexName(tableName, index))};`;
}

function fieldsEqual(left: SchemaField, right: SchemaField): boolean {
  return (
    left.type === right.type &&
    left.constraints.isNullable === right.constraints.isNullable &&
    left.constraints.defaultValue === right.constraints.defaultValue &&
    left.constraints.isPrimaryKey === right.constraints.isPrimaryKey &&
    left.constraints.isUnique === right.constraints.isUnique &&
    left.constraints.isAutoincrement === right.constraints.isAutoincrement &&
    left.constraints.isIdentity === right.constraints.isIdentity &&
    left.constraints.check === right.constraints.check &&
    left.constraints.generated === right.constraints.generated
  );
}

function refsEqual(left: SchemaReference, right: SchemaReference): boolean {
  return (
    left.sourceTable === right.sourceTable &&
    left.sourceField === right.sourceField &&
    left.targetTable === right.targetTable &&
    left.targetField === right.targetField &&
    left.onDelete === right.onDelete &&
    left.onUpdate === right.onUpdate &&
    left.deferrable === right.deferrable
  );
}

function compareColumns(
  tableName: string,
  prev: SchemaField[],
  curr: SchemaField[],
): ColumnDiff[] {
  const diffs: ColumnDiff[] = [];
  const prevMap = new Map(prev.map((field) => [field.name, field]));
  const currMap = new Map(curr.map((field) => [field.name, field]));

  for (const [name, field] of currMap) {
    const oldField = prevMap.get(name);
    if (!oldField) {
      diffs.push({ action: 'CREATE', tableName, columnName: name, newField: field });
    } else if (!fieldsEqual(oldField, field)) {
      diffs.push({
        action: 'ALTER',
        tableName,
        columnName: name,
        oldField,
        newField: field,
      });
    }
  }

  for (const [name, field] of prevMap) {
    if (!currMap.has(name)) {
      diffs.push({ action: 'DROP', tableName, columnName: name, oldField: field });
    }
  }

  return diffs;
}

function columnAlterSql(
  engine: SqlEngine,
  tableName: string,
  oldField: SchemaField,
  newField: SchemaField,
  enumNames?: ReadonlySet<string>,
): string[] {
  const table = q(tableName);
  const column = q(newField.name);
  const sql: string[] = [];
  if (oldField.name !== newField.name) {
    sql.push(`ALTER TABLE ${table} RENAME COLUMN ${q(oldField.name)} TO ${column};`);
  }
  if (engine === 'sqlite') {
    if (oldField.type !== newField.type || oldField.constraints.isNullable !== newField.constraints.isNullable) {
      sql.push(`-- SQLite: Column alterations on ${table}.${column} require recreating table ${table}.`);
    }
    return sql;
  }
  if (oldField.type !== newField.type) {
    sql.push(
      `ALTER TABLE ${table} ALTER COLUMN ${column} TYPE ${storedType('postgres', newField.type, newField.name, enumNames).sql};`,
    );
  }
  if (oldField.constraints.isNullable !== newField.constraints.isNullable) {
    sql.push(
      newField.constraints.isNullable === false
        ? `ALTER TABLE ${table} ALTER COLUMN ${column} SET NOT NULL;`
        : `ALTER TABLE ${table} ALTER COLUMN ${column} DROP NOT NULL;`,
    );
  }
  if (oldField.constraints.defaultValue !== newField.constraints.defaultValue) {
    sql.push(
      newField.constraints.defaultValue
        ? `ALTER TABLE ${table} ALTER COLUMN ${column} SET DEFAULT ${sqlDefault('postgres', newField.constraints.defaultValue)};`
        : `ALTER TABLE ${table} ALTER COLUMN ${column} DROP DEFAULT;`,
    );
  }
  if (oldField.constraints.isUnique !== newField.constraints.isUnique) {
    const constraint = `${tableName}_${newField.name}_key`;
    sql.push(
      newField.constraints.isUnique
        ? `ALTER TABLE ${table} ADD CONSTRAINT ${q(constraint)} UNIQUE (${column});`
        : `ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${q(constraint)};`,
    );
  }
  if (oldField.constraints.isPrimaryKey !== newField.constraints.isPrimaryKey) {
    sql.push(
      `-- primary key change on ${table}.${column} (apply manually)`,
    );
  }
  return sql;
}

function foldRenames(diffs: ColumnDiff[]): ColumnDiff[] {
  const drops = diffs.filter((diff) => diff.action === 'DROP' && diff.oldField);
  const creates = diffs.filter((diff) => diff.action === 'CREATE' && diff.newField);
  if (drops.length !== 1 || creates.length !== 1) return diffs;
  const oldField = drops[0].oldField;
  const newField = creates[0].newField;
  if (!oldField || !newField || oldField.type !== newField.type) return diffs;
  if (oldField.constraints.isNullable !== newField.constraints.isNullable) return diffs;
  return [
    ...diffs.filter((diff) => diff.action === 'ALTER'),
    {
      action: 'ALTER',
      tableName: drops[0].tableName,
      columnName: newField.name,
      oldField,
      newField,
    },
  ];
}

export function diffSchema(
  previousAST: DatabaseAST,
  currentAST: DatabaseAST,
  options?: SchemaDiffOptions,
): SchemaDiffResult {
  const engine: SqlEngine = options?.engine ?? 'postgres';
  const tables: TableDiff[] = [];
  const indexes: IndexDiff[] = [];
  const references: ReferenceDiff[] = [];
  const hazards: SchemaHazard[] = [];
  const upSql: string[] = [];
  const downSql: string[] = [];

  const enumNames = new Set<string>([
    ...Object.values(previousAST.enums ?? {}).map((e) => e.name),
    ...Object.values(currentAST.enums ?? {}).map((e) => e.name),
  ]);

  const prevTables = Object.keys(previousAST.tables);
  const currTables = Object.keys(currentAST.tables);
  const created = currTables.filter((name) => !previousAST.tables[name]);
  const dropped = prevTables.filter((name) => !currentAST.tables[name]);
  const shared = currTables.filter((name) => previousAST.tables[name]);
  const droppedSet = new Set(dropped);

  for (const name of created) {
    const table = currentAST.tables[name];
    tables.push({ action: 'CREATE', tableName: name, table, columnDiffs: [] });
  }
  for (const name of dropped) {
    const table = previousAST.tables[name];
    tables.push({ action: 'DROP', tableName: name, table, columnDiffs: [] });
    hazards.push({
      id: `drop-table-${name}`,
      level: 'danger',
      title: `Drop table "${name}"`,
      description: `Table "${name}" and all of its rows will be permanently deleted.`,
      tableName: name,
    });
  }
  for (const name of shared) {
    const columnDiffs = compareColumns(
      name,
      previousAST.tables[name].fields,
      currentAST.tables[name].fields,
    );
    if (columnDiffs.length > 0) {
      tables.push({ action: 'ALTER', tableName: name, columnDiffs });
    }
  }

  const prevIndexMap = new Map<string, { tableName: string; index: SchemaIndex }>();
  const currIndexMap = new Map<string, { tableName: string; index: SchemaIndex }>();
  for (const table of Object.values(previousAST.tables)) {
    for (const index of table.indexes ?? []) {
      prevIndexMap.set(indexKey(table.name, index), { tableName: table.name, index });
    }
  }
  for (const table of Object.values(currentAST.tables)) {
    for (const index of table.indexes ?? []) {
      currIndexMap.set(indexKey(table.name, index), { tableName: table.name, index });
    }
  }
  for (const [key, value] of currIndexMap) {
    if (prevIndexMap.has(key) || droppedSet.has(value.tableName)) continue;
    if (created.includes(value.tableName) || shared.includes(value.tableName)) {
      indexes.push({
        action: 'CREATE',
        tableName: value.tableName,
        indexName: indexName(value.tableName, value.index),
        columns: value.index.columns,
        isUnique: value.index.isUnique,
      });
    }
  }
  for (const [key, value] of prevIndexMap) {
    if (currIndexMap.has(key) || droppedSet.has(value.tableName)) continue;
    indexes.push({
      action: 'DROP',
      tableName: value.tableName,
      indexName: indexName(value.tableName, value.index),
      columns: value.index.columns,
      isUnique: value.index.isUnique,
    });
  }

  const prevRefs = Object.values(previousAST.references);
  const currRefs = Object.values(currentAST.references);
  const prevRefById = new Map(prevRefs.map((ref) => [ref.id, ref]));
  const currRefById = new Map(currRefs.map((ref) => [ref.id, ref]));

  for (const ref of currRefs) {
    const previous = prevRefById.get(ref.id);
    if (!previous) {
      references.push({ action: 'CREATE', refId: ref.id, current: ref });
    } else if (!refsEqual(previous, ref)) {
      references.push({
        action: 'ALTER',
        refId: ref.id,
        previous,
        current: ref,
      });
    }
  }
  for (const ref of prevRefs) {
    if (!currRefById.has(ref.id)) {
      references.push({ action: 'DROP', refId: ref.id, previous: ref });
    }
  }

  const allRefsList = [...prevRefs, ...currRefs];
  const droppedRefs = references.filter((diff) => diff.action === 'DROP' && diff.previous);
  const alteredRefs = references.filter((diff) => diff.action === 'ALTER');
  const createdRefs = references.filter((diff) => diff.action === 'CREATE' && diff.current);

  for (const diff of droppedRefs) {
    upSql.push(dropFkSql(diff.previous!, allRefsList, engine));
    downSql.unshift(addFkSql(diff.previous!, allRefsList, engine));
  }
  for (const diff of alteredRefs) {
    upSql.push(dropFkSql(diff.previous!, allRefsList, engine));
    downSql.unshift(addFkSql(diff.previous!, allRefsList, engine));
  }

  for (const name of dropped) {
    const table = previousAST.tables[name];
    for (const index of table.indexes ?? []) {
      upSql.push(dropIndexSql(name, index));
      downSql.unshift(createIndexSql(name, index));
    }
    upSql.push(dropTableSql(engine, name));
    downSql.unshift(createTableSql(engine, name, table, enumNames));
  }

  for (const name of shared) {
    const columnDiffs = foldRenames(
      tables.find((table) => table.tableName === name && table.action === 'ALTER')
        ?.columnDiffs ?? [],
    );
    for (const diff of columnDiffs) {
      if (diff.action === 'DROP' && diff.oldField) {
        hazards.push({
          id: `drop-column-${name}-${diff.columnName}`,
          level: 'danger',
          title: `Drop column "${name}.${diff.columnName}"`,
          description: `Column "${diff.columnName}" on table "${name}" and all data stored within it will be permanently lost.`,
          tableName: name,
          columnName: diff.columnName,
        });
        upSql.push(`ALTER TABLE ${q(name)} DROP COLUMN ${q(diff.columnName)};`);
        downSql.unshift(
          `ALTER TABLE ${q(name)} ADD COLUMN ${columnToSql(engine, diff.oldField, enumNames)};`,
        );
      }
    }
    for (const diff of columnDiffs) {
      if (diff.action === 'CREATE' && diff.newField) {
        if (
          diff.newField.constraints.isNullable === false &&
          !diff.newField.constraints.defaultValue &&
          !diff.newField.constraints.isPrimaryKey
        ) {
          throw new Error(
            `Column "${diff.newField.name}" is NOT NULL and needs a default before it can be added.`,
          );
        }
        upSql.push(`ALTER TABLE ${q(name)} ADD COLUMN ${columnToSql(engine, diff.newField, enumNames)};`);
        downSql.unshift(`ALTER TABLE ${q(name)} DROP COLUMN ${q(diff.columnName)};`);
      }
    }
    for (const diff of columnDiffs) {
      if (diff.action === 'ALTER' && diff.oldField && diff.newField) {
        if (diff.oldField.type !== diff.newField.type) {
          hazards.push({
            id: `type-change-${name}-${diff.columnName}`,
            level: 'warning',
            title: `Type changed on "${name}.${diff.columnName}"`,
            description: `Column "${diff.columnName}" converted from ${diff.oldField.type} to ${diff.newField.type}. Existing values may be truncated or fail to cast.`,
            tableName: name,
            columnName: diff.columnName,
          });
        }
        if (
          diff.oldField.constraints.isNullable &&
          diff.newField.constraints.isNullable === false &&
          !diff.newField.constraints.defaultValue
        ) {
          hazards.push({
            id: `not-null-${name}-${diff.columnName}`,
            level: 'warning',
            title: `NOT NULL added to "${name}.${diff.columnName}" without default`,
            description: `Applying NOT NULL without a default will fail if existing rows contain NULL values.`,
            tableName: name,
            columnName: diff.columnName,
          });
        }
        const forward = columnAlterSql(engine, name, diff.oldField, diff.newField, enumNames);
        const backward = columnAlterSql(engine, name, diff.newField, diff.oldField, enumNames);
        upSql.push(...forward);
        downSql.unshift(...backward);
      }
    }
  }

  for (const name of created) {
    const table = currentAST.tables[name];
    upSql.push(createTableSql(engine, name, table, enumNames));
    downSql.unshift(dropTableSql(engine, name));
  }

  for (const [key, value] of prevIndexMap) {
    if (currIndexMap.has(key) || droppedSet.has(value.tableName)) continue;
    upSql.push(dropIndexSql(value.tableName, value.index));
    downSql.unshift(createIndexSql(value.tableName, value.index));
  }
  for (const [key, value] of currIndexMap) {
    if (prevIndexMap.has(key)) continue;
    upSql.push(createIndexSql(value.tableName, value.index));
    downSql.unshift(dropIndexSql(value.tableName, value.index));
  }

  for (const diff of alteredRefs) {
    upSql.push(addFkSql(diff.current!, allRefsList, engine));
    downSql.unshift(dropFkSql(diff.current!, allRefsList, engine));
  }
  for (const diff of createdRefs) {
    upSql.push(addFkSql(diff.current!, allRefsList, engine));
    downSql.unshift(dropFkSql(diff.current!, allRefsList, engine));
  }

  return {
    tables,
    indexes,
    references,
    hazards,
    upSql: dedupe(upSql.filter(Boolean)),
    downSql: dedupe(downSql.filter(Boolean)),
  };
}

export function summarizeDiff(result: SchemaDiffResult) {
  const statements = (lines: string[]) =>
    lines.filter((line) => !line.startsWith('--')).length;
  return {
    tables: result.tables.length,
    indexes: result.indexes.length,
    references: result.references.length,
    up: statements(result.upSql),
    down: statements(result.downSql),
    hazards: (result.hazards ?? []).length,
  };
}

export class SchemaDiffEngine {
  public static compare(
    previousAST: DatabaseAST,
    currentAST: DatabaseAST,
    options?: SchemaDiffOptions,
  ): SchemaDiffResult {
    return diffSchema(previousAST, currentAST, options);
  }
}

