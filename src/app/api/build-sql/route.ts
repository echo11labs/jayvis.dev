import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { databaseASTSchema } from '@/lib/ast-schema';
import { buildSqlScript, buildSqlStatements } from '@/lib/export/ddl-sqlite';
import { prepareMigrationAst } from '@/lib/migrations';
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

const buildSqlSchema = z.object({
  statements: z.array(
    z.object({
      sql: z.string().min(1),
      description: z.string(),
    }),
  ).min(1, 'No statements provided'),
});

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
 * `{ ast }` returns the SQLite script. `{ statements }` executes it.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return sqlError(400, 'SQL_INVALID_BODY', 'Invalid JSON body');
  }

  if (body && typeof body === 'object' && 'ast' in body && !('statements' in body)) {
    const ast = databaseASTSchema.safeParse(prepareMigrationAst(body.ast));
    if (!ast.success) {
      const issue = ast.error.issues[0];
      return sqlError(
        400,
        'SQL_INVALID_SCHEMA',
        issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid schema',
      );
    }
    const statements = buildSqlStatements(ast.data);
    return NextResponse.json({
      success: true,
      preview: true,
      statements,
      script: buildSqlScript(ast.data),
      summary: {
        tables: Object.keys(ast.data.tables).length,
        references: Object.keys(ast.data.references).length,
        statements: statements.length,
      },
    });
  }

  const readiness = await ensureDatabase();
  if (readiness) return readiness;

  const parseResult = buildSqlSchema.safeParse(body);
  if (!parseResult.success) {
    return sqlError(400, 'SQL_INVALID_PAYLOAD', 'Invalid payload', {
      details: parseResult.error.issues,
    });
  }

  const forbidden = parseResult.data.statements.find(
    (statement) =>
      !isAllowedBuildStatement(statement.sql) ||
      statementTouchesProtectedTable(statement.sql),
  );
  if (forbidden) {
    return sqlError(
      400,
      'SQL_FORBIDDEN',
      `Refusing to execute unprotected SQL: ${forbidden.description}`,
    );
  }

  const statements = parseResult.data.statements;
  const results: ExecuteResult[] = [];

  try {
    await db.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
    await db.$transaction(async (tx) => {
      for (const stmt of statements) {
        try {
          const rowsAffected = await tx.$executeRawUnsafe(stmt.sql);
          results.push({
            statement: stmt.sql,
            description: stmt.description,
            success: true,
            rowsAffected,
          });
        } catch (err: unknown) {
          results.push({
            statement: stmt.sql,
            description: stmt.description,
            success: false,
            error: err instanceof Error ? err.message : 'Execution failed',
          });
          throw err;
        }
      }
    });

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        succeeded: results.filter((result) => result.success).length,
        failed: results.filter((result) => !result.success).length,
      },
    });
  } catch (err: unknown) {
    return sqlError(
      500,
      'SQL_EXEC_FAILED',
      err instanceof Error ? err.message : 'Transaction failed',
      {
        results,
        summary: {
          total: results.length,
          succeeded: results.filter((result) => result.success).length,
          failed: results.filter((result) => !result.success).length,
        },
      },
    );
  }
}

export async function GET() {
  const readiness = await ensureDatabase();
  if (readiness) return readiness;

  try {
    const tables = (await db.$queryRawUnsafe(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name;",
    )) as Array<{ name: string }>;
    return NextResponse.json({
      success: true,
      ready: true,
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

export async function DELETE() {
  const readiness = await ensureDatabase();
  if (readiness) return readiness;

  try {
    const tables = (await db.$queryRawUnsafe(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name;",
    )) as Array<{ name: string }>;
    const jayvisTables = tables.filter((table) => !isProtectedTable(table.name));
    const dropped: string[] = [];
    const failed: string[] = [];

    for (const table of [...jayvisTables].reverse()) {
      try {
        await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table.name}";`);
        dropped.push(table.name);
      } catch {
        failed.push(table.name);
      }
    }

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
