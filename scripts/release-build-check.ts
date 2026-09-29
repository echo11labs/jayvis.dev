import { DatabaseSync } from 'node:sqlite';
import { readSqliteCatalog } from '../src/lib/sql-catalog';
import { planBuild } from '../src/lib/sql-plan';
import { oneTable, oneTablePlusColumn } from '../src/lib/sql-fixtures/schemas';

const file = process.env.DATABASE_URL?.replace(/^file:/, '');
if (!file) throw new Error('DATABASE_URL is required');

const db = new DatabaseSync(file);
const query = async (sql: string) => db.prepare(sql).all() as Record<string, unknown>[];

async function main() {
async function apply(ast: ReturnType<typeof oneTable>) {
  const catalog = await readSqliteCatalog(query);
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

const first = await apply(oneTable());
if (!first.statements.some((statement) => statement.sql.includes('CREATE TABLE'))) {
  throw new Error('first build did not create a table');
}
const second = await apply(oneTablePlusColumn());
if (second.statements.some((statement) => statement.sql.startsWith('CREATE TABLE'))) {
  throw new Error('second build recreated the table');
}
const columns = db.prepare('PRAGMA table_info("widgets")').all() as Array<{ name: string }>;
if (!columns.some((column) => column.name === 'sku')) {
  throw new Error('second build did not add sku');
}
const ledger = db.prepare("SELECT name FROM sqlite_master WHERE name = '_prisma_migrations'").get();
if (!ledger) throw new Error('migration ledger is missing');
db.close();
console.log('release build check ok');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
