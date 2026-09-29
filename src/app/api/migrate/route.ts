import { NextRequest, NextResponse } from 'next/server';
import { isLocalRequest, remoteForbiddenBody } from '@/lib/local-request';
import { databaseASTSchema } from '@/lib/ast-schema';
import { buildMigration, prepareMigrationAst } from '@/lib/migrations';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  baseline: databaseASTSchema.nullable(),
  current: databaseASTSchema,
});

/**
 * POST /api/migrate
 * Diff a saved baseline against the current schema and return PostgreSQL UP/DOWN SQL.
 */
export async function POST(req: NextRequest) {
  if (!isLocalRequest(req.headers)) {
    return NextResponse.json(remoteForbiddenBody(), { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body', code: 'MIGRATE_INVALID_BODY' },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse({
    baseline: body && typeof body === 'object' && 'baseline' in body && body.baseline
      ? prepareMigrationAst(body.baseline)
      : null,
    current:
      body && typeof body === 'object' && 'current' in body
        ? prepareMigrationAst(body.current)
        : undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      {
        success: false,
        error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid schema',
        code: 'MIGRATE_INVALID_SCHEMA',
      },
      { status: 400 },
    );
  }

  const result = buildMigration(parsed.data.baseline, parsed.data.current);
  return NextResponse.json({ success: true, ...result });
}
