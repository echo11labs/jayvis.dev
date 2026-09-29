import { DatabaseSync } from 'node:sqlite';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { readPostgresCatalog, readSqliteCatalog } from '@/lib/sql-catalog';
import { planBuild, type LiveCatalog } from '@/lib/sql-plan';
import { buildSchemaScript } from '@/lib/sql-script';
import {
  cyclic,
  emptyTable,
  oneTable,
  oneTablePlusColumn,
  poisonedDefault,
  reservedWords,
} from './schemas';

async function applySqlite(db: DatabaseSync, ast: Parameters<typeof planBuild>[0]) {
  const catalog = await readSqliteCatalog(async (sql) => db.prepare(sql).all() as Record<string, unknown>[]);
  const plan = planBuild(ast, catalog, 'sqlite');
  db.exec('BEGIN');
  try {
    for (const statement of plan.statements) db.exec(statement.sql);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return plan;
}

async function applyPostgres(db: PGlite, ast: Parameters<typeof planBuild>[0]) {
  const catalog = await readPostgresCatalog(async (sql) => {
    const result = await db.query(sql);
    return result.rows as Record<string, unknown>[];
  });
  const plan = planBuild(ast, catalog, 'postgres');
  await db.exec('BEGIN');
  try {
    for (const statement of plan.statements) await db.exec(statement.sql);
    await db.exec('SET CONSTRAINTS ALL IMMEDIATE');
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
  return plan;
}

describe('sql fixtures', () => {
  it('quotes reserved words and poisoned defaults', () => {
    const reserved = buildSchemaScript(reservedWords(), 'sqlite').script;
    expect(reserved).toContain('"order"');
    expect(reserved).toContain('"group"');
    const poisoned = buildSchemaScript(poisonedDefault(), 'postgres').script;
    expect(poisoned).toContain("DEFAULT '1); DROP TABLE users'");
    expect(poisoned).not.toContain('DROP TABLE users;');
    expect(buildSchemaScript(emptyTable(), 'sqlite').script).toContain('CREATE TABLE "bins"');
    expect(buildSchemaScript(cyclic(), 'postgres').script).toContain('DEFERRABLE INITIALLY DEFERRED');
  });

  it('round-trips on SQLite and adds one column on the second build', async () => {
    for (const ast of [reservedWords(), cyclic(), emptyTable(), poisonedDefault()]) {
      const fixture = new DatabaseSync(':memory:');
      await applySqlite(fixture, ast);
      if (ast.tables.bins) {
        const rows = fixture.prepare('SELECT COUNT(*) AS n FROM "bins"').get() as { n: number };
        expect(rows.n).toBe(0);
      }
      fixture.close();
    }
    const db = new DatabaseSync(':memory:');
    await applySqlite(db, oneTable());
    const second = await applySqlite(db, oneTablePlusColumn());
    expect(second.statements.some((statement) => statement.sql.includes('"sku"'))).toBe(true);
    expect(second.statements.some((statement) => statement.sql.startsWith('CREATE TABLE'))).toBe(false);
    const columns = db.prepare('PRAGMA table_info("widgets")').all() as Array<{ name: string }>;
    expect(columns.map((column) => column.name)).toContain('sku');
    db.close();
  });

  it('round-trips on PGlite and adds one column on the second build', async () => {
    for (const ast of [reservedWords(), cyclic(), emptyTable(), poisonedDefault()]) {
      const fixture = new PGlite();
      await applyPostgres(fixture, ast);
      await fixture.close();
    }
    const db = new PGlite();
    await applyPostgres(db, oneTable());
    const second = await applyPostgres(db, oneTablePlusColumn());
    expect(second.statements.some((statement) => statement.sql.includes('"sku"'))).toBe(true);
    const columns = await db.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'widgets'",
    );
    expect(columns.rows.map((row) => row.column_name)).toContain('sku');
    await db.close();
  });

  it('rejects a NOT NULL column with no default on an existing table', async () => {
    const db = new DatabaseSync(':memory:');
    await applySqlite(db, oneTable());
    const next = oneTable();
    next.tables.widgets.fields.push({
      id: 'widgets.sku',
      name: 'sku',
      type: 'text',
      constraints: { isNullable: false },
    });
    const catalog: LiveCatalog = await readSqliteCatalog(
      async (sql) => db.prepare(sql).all() as Record<string, unknown>[],
    );
    expect(() => planBuild(next, catalog, 'sqlite')).toThrow(/sku/);
    db.close();
  });
});
