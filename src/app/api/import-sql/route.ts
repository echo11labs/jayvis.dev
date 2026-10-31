import { NextRequest, NextResponse } from 'next/server';
import { isLocalRequest, remoteForbiddenBody } from '@/lib/local-request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PARSER_BASE_URL = (
  process.env.DBML_PARSER_URL ?? 'http://127.0.0.1:3031'
).replace(/\/+$/, '');
const PARSER_TIMEOUT_MS = Number(
  process.env.DBML_PARSER_TIMEOUT_MS ?? 5000,
);

export async function POST(req: NextRequest) {
  if (!isLocalRequest(req.headers)) {
    return NextResponse.json(remoteForbiddenBody(), { status: 403 });
  }

  try {
    const body = await req.text();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PARSER_TIMEOUT_MS);

    const upstream = await fetch(`${PARSER_BASE_URL}/import-sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'SQL conversion failed',
      },
      { status: 500 },
    );
  }
}
