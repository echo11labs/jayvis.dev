import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { databaseASTSchema } from '@/lib/ast-schema';
import { prepareMigrationAst } from '@/lib/migrations';
import { isLocalRequest } from '@/lib/local-request';
import { isAllowedBuildStatement, statementTouchesProtectedTable } from '@/lib/sql-guard';
import { generateMockSeedScript } from '@/lib/seeding/mock-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function refuseRemote(req: NextRequest) {
  if (isLocalRequest(req.headers)) return null;
  return NextResponse.json(
    { success: false, error: 'Database seeding is available locally only', code: 'SEED_REMOTE_FORBIDDEN' },
    { status: 403 },
  );
}

export async function POST(req: NextRequest) {
  const remote = refuseRemote(req);
  if (remote) return remote;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body', code: 'SEED_INVALID_BODY' },
      { status: 400 },
    );
  }

  if (!body || typeof body !== 'object' || !('ast' in body)) {
    return NextResponse.json(
      { success: false, error: 'Payload must include ast', code: 'SEED_INVALID_PAYLOAD' },
      { status: 400 },
    );
  }

  const { ast: rawAst, count = 5, execute = false } = body as {
    ast: unknown;
    count?: number;
    execute?: boolean;
  };

  const parsed = databaseASTSchema.safeParse(prepareMigrationAst(rawAst));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      {
        success: false,
        error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid schema',
        code: 'SEED_INVALID_SCHEMA',
      },
      { status: 400 },
    );
  }

  const clampedCount = Math.max(1, Math.min(50, Number(count) || 5));
  const seedResult = generateMockSeedScript(parsed.data, {
    count: clampedCount,
    engine: 'sqlite',
  });

  if (!execute) {
    return NextResponse.json({
      success: true,
      totalRows: seedResult.totalRows,
      tables: seedResult.tables,
      fullScript: seedResult.fullScript,
    });
  }

  // Execute in a transaction
  try {
    let executedCount = 0;
    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
      for (const table of seedResult.tables) {
        for (const stmt of table.statements) {
          if (!isAllowedBuildStatement(stmt) || statementTouchesProtectedTable(stmt)) {
            throw new Error(`Rejected unauthorized statement: ${stmt}`);
          }
          await tx.$executeRawUnsafe(stmt);
          executedCount += 1;
        }
      }
    });

    return NextResponse.json({
      success: true,
      totalRows: executedCount,
      tables: seedResult.tables.map((t) => ({ tableName: t.tableName, count: t.count })),
      fullScript: seedResult.fullScript,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Database transaction failed',
        code: 'SEED_EXECUTION_FAILED',
      },
      { status: 500 },
    );
  }
}
