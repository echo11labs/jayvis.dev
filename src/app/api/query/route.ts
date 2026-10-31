import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isLocalRequest } from '@/lib/local-request';
import { statementTouchesProtectedTable, stripSqlComments } from '@/lib/sql-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function refuseRemote(req: NextRequest) {
  if (isLocalRequest(req.headers)) return null;
  return NextResponse.json(
    { success: false, error: 'Query execution is available locally only', code: 'QUERY_REMOTE_FORBIDDEN' },
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
      { success: false, error: 'Invalid JSON body', code: 'QUERY_INVALID_BODY' },
      { status: 400 },
    );
  }

  if (!body || typeof body !== 'object' || !('query' in body)) {
    return NextResponse.json(
      { success: false, error: 'Payload must include query string', code: 'QUERY_INVALID_PAYLOAD' },
      { status: 400 },
    );
  }

  const rawQuery = String((body as { query: string }).query || '').trim();
  if (!rawQuery) {
    return NextResponse.json(
      { success: false, error: 'Query cannot be empty', code: 'QUERY_EMPTY' },
      { status: 400 },
    );
  }

  if (statementTouchesProtectedTable(rawQuery)) {
    return NextResponse.json(
      { success: false, error: 'Access to internal database tables is protected', code: 'QUERY_PROTECTED_TABLE' },
      { status: 403 },
    );
  }

  const start = performance.now();
  const stripped = stripSqlComments(rawQuery);
  const isSelect = /^SELECT\b/i.test(stripped) || /^PRAGMA\b/i.test(stripped) || /^EXPLAIN\b/i.test(stripped);

  try {
    if (isSelect) {
      const rawRows = (await db.$queryRawUnsafe(rawQuery)) as Array<Record<string, unknown>>;
      const durationMs = Math.round((performance.now() - start) * 100) / 100;
      const columns = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];

      // Convert BigInts or dates to serializable format
      const rows = rawRows.map((r) => {
        const row: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) {
          if (typeof v === 'bigint') {
            row[k] = v.toString();
          } else {
            row[k] = v;
          }
        }
        return row;
      });

      return NextResponse.json({
        success: true,
        columns,
        rows,
        count: rows.length,
        durationMs,
        query: rawQuery,
      });
    } else {
      const rowsAffected = await db.$executeRawUnsafe(rawQuery);
      const durationMs = Math.round((performance.now() - start) * 100) / 100;

      return NextResponse.json({
        success: true,
        columns: ['rows_affected'],
        rows: [{ rows_affected: rowsAffected }],
        count: rowsAffected,
        durationMs,
        query: rawQuery,
      });
    }
  } catch (err: unknown) {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Query execution failed',
        code: 'QUERY_EXECUTION_ERROR',
        durationMs,
      },
      { status: 400 },
    );
  }
}
