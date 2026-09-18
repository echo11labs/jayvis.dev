import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/parse
 *
 * Thin proxy to the isolated DBML parser mini-service on port 3031.
 * Keeping @dbml/core (21 MB pegjs parser) in a separate Bun process
 * prevents Turbopack OOM during the Next.js client/server compile.
 *
 * The browser calls this relative path; the gateway forwards
 * non-XTransformPort requests here automatically.
 */
const PARSER_URL = 'http://127.0.0.1:3031/parse';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const upstream = await fetch(PARSER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ast: { version: '1.0', tables: {}, references: {} },
        nodes: [],
        edges: [],
        error: `Parser service unavailable: ${err?.message || 'unknown error'}`,
      },
      { status: 502 },
    );
  }
}
