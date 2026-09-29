import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { databaseASTSchema } from '@/lib/ast-schema';
import { buildSchemaScript } from '@/lib/sql-script';
import { planBuild } from '@/lib/sql-plan';
import { readPostgresCatalog, readSqliteCatalog } from '@/lib/sql-catalog';
import { backupSqliteDatabase } from '@/lib/sql-backup';
import { postgresAvailable, postgresPool } from '@/lib/pg';
import { SqlBuildError, type SqlEngine } from '@/lib/sql-literal';
import { prepareMigrationAst } from '@/lib/migrations';
import { quoteIdent } from '@/lib/ident';
import { isLocalRequest } from '@/lib/local-request';
import {
  isAllowedBuildStatement,
  isProtectedTable,
  statementTouchesProtectedTable,
} from '@/lib/sql-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ExecuteResult {
  statement: string;
  description: string;
  success: boolean;
  error?: string;
  rowsAffected?: number;
}

function refuseRemote(req: NextRequest) {
  if (isLocalRequest(req.headers)) return null;
  return sqlError(403, 'SQL_REMOTE_FORBIDDEN', 'SQL builder is local only');
}

function sqlError(
  status: number,
  code: string,
  error: string,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json(
    {
      success: false,
      error,
      code,
      ...extra,
    },
    { status },
  );
}

async function ensureDatabase() {
  try {
    await db.$queryRawUnsafe('SELECT 1');
    return null;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unable to open the database file';
    return sqlError(503, 'SQL_DB_UNAVAILABLE', message);
  }
}

/**
 * POST /api/build-sql
 * `{ ast }` previews the SQLite script. `{ ast, execute: true }` builds and runs it.
 */
export async function POST(req: NextRequest) {
  const remote = refuseRemote(req);
  if (remote) return remote;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return sqlError(400, 'SQL_INVALID_BODY', 'Invalid JSON body');
  }

  if (body && typeof body === 'object' && 'statements' in body) {
    return sqlError(
      400,
      'SQL_CLIENT_SQL_REJECTED',
      'Send the schema. The server builds the SQL.',
    );
  }

  if (!body || typeof body !== 'object' || !('ast' in body)) {
    return sqlError(400, 'SQL_INVALID_PAYLOAD', 'Invalid payload');
  }

  const execute = 'execute' in body && body.execute === true;
  const confirmDestructive = 'confirmDestructive' in body && body.confirmDestructive === true;
  const engine: SqlEngine = 'engine' in body && body.engine === 'postgres' ? 'postgres' : 'sqlite';
  const ast = databaseASTSchema.safeParse(prepareMigrationAst(body.ast));
  if (!ast.success) {
    const issue = ast.error.issues[0];
    return sqlError(
      400,
      'SQL_INVALID_SCHEMA',
      issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid schema',
    );
  }

  if (engine === 'postgres' && !postgresAvailable()) {
    return sqlError(400, 'SQL_POSTGRES_UNAVAILABLE', 'Set POSTGRES_URL to build on PostgreSQL.');
  }

  let plan;
  try {
    const catalog = engine === 'postgres'
      ? await readPostgresCatalog(async (sql) => {
          const result = await postgresPool().query(sql);
          return result.rows as Record<string, unknown>[];
        })
      : await readSqliteCatalog(async (sql) => db.$queryRawUnsafe(sql) as Promise<Record<string, unknown>[]>);
    plan = planBuild(ast.data, catalog, engine);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not plan the build';
    return sqlError(400, error instanceof SqlBuildError ? 'SQL_PLAN_REJECTED' : 'SQL_PLAN_FAILED', message);
  }

  const built = buildSchemaScript(ast.data, engine);
  if (!execute) {
    return NextResponse.json({
      success: true,
      preview: true,
      engine,
      notes: plan.notes,
      destructive: plan.destructive,
      statements: plan.statements,
      script: built.script,
      summary: {
        tables: Object.keys(ast.data.tables).length,
        references: Object.keys(ast.data.references).length,
        statements: plan.statements.length,
      },
    });
  }

  if (engine === 'sqlite') {
    const readiness = await ensureDatabase();
    if (readiness) return readiness;
  }

  const forbidden = plan.statements.find(
    (statement) =>
      !isAllowedBuildStatement(statement.sql) ||
      statementTouchesProtectedTable(statement.sql),
  );
  if (forbidden) {
    return sqlError(400, 'SQL_FORBIDDEN', `Refusing to execute unprotected SQL: ${forbidden.description}`);
  }
  if (plan.destructive && !confirmDestructive) {
    return sqlError(409, 'SQL_CONFIRM_DESTRUCTIVE', 'This build drops or rewrites existing tables.', {
      destructive: true,
      statements: plan.statements,
    });
  }

  const backup = engine === 'sqlite' && plan.destructive ? backupSqliteDatabase() : null;
  const results: ExecuteResult[] = [];
  try {
    if (engine === 'sqlite') {
      const rebuild = plan.statements.some((statement) => statement.sql.includes('__jayvis_new'));
      if (rebuild) await db.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');
      else await db.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
      await db.$transaction(async (tx) => {
        for (const statement of plan.statements) {
          const rowsAffected = await tx.$executeRawUnsafe(statement.sql);
          results.push({
            statement: statement.sql,
            description: statement.description,
            success: true,
            rowsAffected,
          });
        }
      });
      if (rebuild) await db.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
    } else {
      const client = await postgresPool().connect();
      try {
        await client.query('BEGIN');
        for (const statement of plan.statements) {
          const query = statement.sql.replace(/;+\s*$/, '');
          await client.query(query);
          results.push({
            statement: statement.sql,
            description: statement.description,
            success: true,
          });
        }
        await client.query('SET CONSTRAINTS ALL IMMEDIATE');
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
    return NextResponse.json({
      success: true,
      engine,
      backup,
      results,
      summary: {
        total: results.length,
        succeeded: results.length,
        failed: 0,
      },
    });
  } catch (err: unknown) {
    return sqlError(500, 'SQL_EXEC_FAILED', err instanceof Error ? err.message : 'Transaction failed', {
      results,
      backup,
      summary: {
        total: results.length,
        succeeded: results.filter((result) => result.success).length,
        failed: results.filter((result) => !result.success).length + 1,
      },
    });
  }
}

export async function GET(req: NextRequest) {
  const remote = refuseRemote(req);
  if (remote) return remote;

  const readiness = await ensureDatabase();
  if (readiness) return readiness;

  try {
    const tables = (await db.$queryRawUnsafe(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name;",
    )) as Array<{ name: string }>;
    return NextResponse.json({
      success: true,
      ready: true,
      postgres: postgresAvailable(),
      tables: tables
        .map((table) => table.name)
        .filter((name) => !isProtectedTable(name)),
    });
  } catch (err: unknown) {
    return sqlError(
      500,
      'SQL_LIST_FAILED',
      err instanceof Error ? err.message : 'Failed to list tables',
    );
  }
}

export async function DELETE(req: NextRequest) {
  const remote = refuseRemote(req);
  if (remote) return remote;

  const readiness = await ensureDatabase();
  if (readiness) return readiness;

  try {
    const tables = (await db.$queryRawUnsafe(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name;",
    )) as Array<{ name: string }>;
    const jayvisTables = tables.filter((table) => !isProtectedTable(table.name));
    const dropped: string[] = [];
    const failed: string[] = [];

    await db.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');
    for (const table of [...jayvisTables].reverse()) {
      try {
        await db.$executeRawUnsafe(`DROP TABLE IF EXISTS ${quoteIdent(table.name)};`);
        dropped.push(table.name);
      } catch {
        failed.push(table.name);
      }
    }
    await db.$executeRawUnsafe('PRAGMA foreign_keys = ON;');

    return NextResponse.json({
      success: failed.length === 0,
      dropped,
      count: dropped.length,
      failed,
      protected: tables.filter((table) => isProtectedTable(table.name)).map((table) => table.name),
    });
  } catch (err: unknown) {
    return sqlError(
      500,
      'SQL_DROP_FAILED',
      err instanceof Error ? err.message : 'Failed to drop tables',
    );
  }
}
