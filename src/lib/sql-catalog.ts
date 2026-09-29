import type { CatalogColumn, CatalogTable, LiveCatalog } from '@/lib/sql-plan';
import { quoteIdent } from '@/lib/ident';

type Row = Record<string, unknown>;

export async function readSqliteCatalog(
  query: (sql: string) => Promise<Row[]>,
): Promise<LiveCatalog> {
  const tables = await query(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name",
  );
  const result: CatalogTable[] = [];
  for (const table of tables) {
    const name = String(table.name);
    const columns = await query(`PRAGMA table_info(${quoteIdent(name)})`);
    const indexes = await query(`PRAGMA index_list(${quoteIdent(name)})`);
    const foreignKeys = await query(`PRAGMA foreign_key_list(${quoteIdent(name)})`);
    const mappedIndexes: Array<{ name: string; unique: boolean; columns: string[] }> = [];
    for (const index of indexes) {
      if (Number(index.origin) === 1 || String(index.name).startsWith('sqlite_')) continue;
      const info = await query(`PRAGMA index_info(${quoteIdent(String(index.name))})`);
      mappedIndexes.push({
        name: String(index.name),
        unique: Number(index.unique) === 1,
        columns: info.map((column) => String(column.name)),
      });
    }
    result.push({
      name,
      columns: columns.map((column) => ({
        name: String(column.name),
        type: String(column.type),
        notNull: Number(column.notnull) === 1,
        pk: Number(column.pk) > 0,
      })),
      indexes: mappedIndexes,
      foreignKeys: foreignKeys.map((key) => ({
        columns: [String(key.from)],
        refTable: String(key.table),
        refColumns: [String(key.to)],
      })),
    });
  }
  return { tables: result };
}

export async function readPostgresCatalog(
  query: (sql: string) => Promise<Row[]>,
): Promise<LiveCatalog> {
  const columns = await query(`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name NOT LIKE '!_prisma%' ESCAPE '!'
    ORDER BY table_name, ordinal_position
  `);
  const keys = await query(`
    SELECT kcu.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
  `);
  const primary = new Set(keys.map((key) => `${key.table_name}.${key.column_name}`));
  const byTable = new Map<string, CatalogColumn[]>();
  for (const column of columns) {
    const table = String(column.table_name);
    const list = byTable.get(table) ?? [];
    list.push({
      name: String(column.column_name),
      type: String(column.data_type),
      notNull: String(column.is_nullable) === 'NO',
      pk: primary.has(`${table}.${column.column_name}`),
    });
    byTable.set(table, list);
  }
  const indexes = await query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey'
  `);
  const foreignKeys = await query(`
    SELECT conrelid::regclass::text AS table_name, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE contype = 'f'
  `);
  return {
    tables: [...byTable.entries()].map(([name, cols]) => ({
      name,
      columns: cols,
      indexes: indexes
        .filter((index) => String(index.tablename) === name)
        .map((index) => ({
          name: String(index.indexname),
          unique: String(index.indexdef).includes('UNIQUE'),
          columns: [],
        })),
      foreignKeys: foreignKeys
        .filter((key) => String(key.table_name).replace(/"/g, '') === name)
        .map((key) => {
          const definition = String(key.definition);
          const columns = definition.match(/FOREIGN KEY \(([^)]+)\)/)?.[1]?.split(',').map((part) => part.trim().replace(/"/g, '')) ?? [];
          const refTable = definition.match(/REFERENCES\s+"?([a-zA-Z0-9_]+)"?/)?.[1] ?? '';
          return { columns, refTable, refColumns: [] };
        }),
    })),
  };
}
