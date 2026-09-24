import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { databaseASTSchema } from '@/lib/ast-schema';
import { buildExportFile, type ExportFormat } from '@/lib/export/workspace';
import { prepareMigrationAst } from '@/lib/migrations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const formats = ['dbml', 'json', 'sql', 'sqlite', 'svg', 'prisma'] as const;

const bodySchema = z.object({
  format: z.enum(formats),
  ast: z.unknown(),
  positions: z.record(z.string(), z.object({ x: z.number(), y: z.number() })).optional(),
  name: z.string().optional(),
});

/**
 * POST /api/export
 * Builds a downloadable schema file from the current AST.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body', code: 'EXPORT_INVALID_BODY' },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid export request', code: 'EXPORT_INVALID_PAYLOAD' },
      { status: 400 },
    );
  }

  const ast = databaseASTSchema.safeParse(prepareMigrationAst(parsed.data.ast));
  if (!ast.success) {
    const issue = ast.error.issues[0];
    return NextResponse.json(
      {
        success: false,
        error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid schema',
        code: 'EXPORT_INVALID_SCHEMA',
      },
      { status: 400 },
    );
  }

  const file = buildExportFile(
    parsed.data.format as ExportFormat,
    ast.data,
    parsed.data.positions ?? {},
    parsed.data.name,
  );
  return NextResponse.json({
    success: true,
    filename: file.filename,
    content: file.content,
    mime: file.mime,
  });
}
