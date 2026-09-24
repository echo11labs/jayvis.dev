import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/parse
 *
 * Thin proxy to the isolated DBML parser mini-service on port 3031.
 * Keeping @dbml/core (21 MB pegjs parser) in a separate Node process
 * prevents Turbopack OOM during the Next.js client/server compile.
 */
const PARSER_BASE_URL = (
  process.env.DBML_PARSER_URL ?? 'http://127.0.0.1:3031'
).replace(/\/+$/, '');
const PARSER_TIMEOUT_MS = Number(
  process.env.DBML_PARSER_TIMEOUT_MS ?? 5000,
);

async function fetchParser(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    PARSER_TIMEOUT_MS,
  );

  try {
    return await fetch(`${PARSER_BASE_URL}${path}`, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function parserFailure(error: unknown) {
  const isTimeout =
    error instanceof Error && error.name === 'AbortError';
  return {
    status: isTimeout ? 504 : 502,
    code: isTimeout ? 'PARSER_TIMEOUT' : 'PARSER_UNAVAILABLE',
    message: isTimeout
      ? `Parser service timed out after ${PARSER_TIMEOUT_MS}ms`
      : `Parser service unavailable: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
  };
}

function unavailableResponse(error: unknown) {
  const failure = parserFailure(error);
  return NextResponse.json(
    {
      ast: { version: '1.0', tables: {}, references: {} },
      nodes: [],
      edges: [],
      error: failure.message,
      code: failure.code,
    },
    { status: failure.status },
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const upstream = await fetchParser('/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('content-type') ??
          'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return unavailableResponse(error);
  }
}

export async function GET() {
  try {
    const upstream = await fetchParser('/health');
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('content-type') ??
          'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const failure = parserFailure(error);
    return NextResponse.json(
      {
        ok: false,
        service: 'jayvis-dbml-parser',
        error: failure.message,
        code: failure.code,
      },
      { status: failure.status },
    );
  }
}
