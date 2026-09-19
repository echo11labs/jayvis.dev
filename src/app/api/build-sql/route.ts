import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ExecuteResult {
  statement: string;
  description: string;
  success: boolean;
  error?: string;
  rowsAffected?: number;
}

/**
 * POST /api/build-sql
 * Body: { "statements": [{ "sql": "...", "description": "..." }, ...] }
 *
 * Executes each SQL statement against the local SQLite database via
 * Prisma's $executeRawUnsafe. Returns per-statement results.
 *
 * Uses a transaction so all statements succeed or all are rolled back.
 */
export async function POST(req: NextRequest) {
  let body: { statements?: Array<{ sql: string; description: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const statements = body.statements;
  if (!statements || !Array.isArray(statements) || statements.length === 0) {
    return NextResponse.json({ error: 'No statements provided' }, { status: 400 });
  }

  const results: ExecuteResult[] = [];

  try {
    // Enable foreign keys first.
    await db.$executeRawUnsafe('PRAGMA foreign_keys = ON;');

    // Execute each statement in a transaction.
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
        } catch (err: any) {
          results.push({
            statement: stmt.sql,
            description: stmt.description,
            success: false,
            error: err?.message || 'Execution failed',
          });
          // Re-throw to abort the transaction.
          throw err;
        }
      }
    });

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        succeeded: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    });
  } catch (err: any) {
    // Transaction was rolled back — but we still have partial results.
    return NextResponse.json({
      success: false,
      results,
      summary: {
        total: results.length,
        succeeded: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
      error: err?.message || 'Transaction failed',
    });
  }
}

/**
 * GET /api/build-sql
 * Returns the list of tables currently in the database (for verification).
 */
export async function GET() {
  try {
    const tables = await db.$queryRawUnsafe(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name;",
    ) as Array<{ name: string }>;
    return NextResponse.json({ tables: tables.map((t) => t.name) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list tables' }, { status: 500 });
  }
}

/**
 * DELETE /api/build-sql
 * Drops all StitchDB-managed tables (for clean re-runs).
 */
export async function DELETE() {
  try {
    const tables = await db.$queryRawUnsafe(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name;",
    ) as Array<{ name: string }>;

    // Exclude known Prisma model tables (User, Post) from being dropped.
    const prismaTables = new Set(['User', 'Post']);
    const stitchdbTables = tables.filter((t) => !prismaTables.has(t.name));

    // Drop in reverse order to respect FK constraints.
    const dropped: string[] = [];
    for (const t of [...stitchdbTables].reverse()) {
      try {
        await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "${t.name}";`);
        dropped.push(t.name);
      } catch {
        // Ignore individual drop failures.
      }
    }

    return NextResponse.json({ dropped, count: dropped.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to drop tables' }, { status: 500 });
  }
}
