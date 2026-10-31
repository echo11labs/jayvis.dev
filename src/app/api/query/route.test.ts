import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

describe('/api/query endpoint', () => {
  it('returns 400 when query is missing or empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/query', {
      method: 'POST',
      body: JSON.stringify({ query: '' }),
      headers: { host: 'localhost:3000', 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('rejects access to protected internal tables', async () => {
    const req = new NextRequest('http://localhost:3000/api/query', {
      method: 'POST',
      body: JSON.stringify({ query: 'SELECT * FROM _prisma_migrations;' }),
      headers: { host: 'localhost:3000', 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(403);
    expect(data.code).toBe('QUERY_PROTECTED_TABLE');
  });

  it('executes a valid SELECT query and returns tabular columns and rows', async () => {
    const req = new NextRequest('http://localhost:3000/api/query', {
      method: 'POST',
      body: JSON.stringify({ query: 'SELECT 1 as num, "test" as label;' }),
      headers: { host: 'localhost:3000', 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.columns).toEqual(['num', 'label']);
    expect(data.rows).toHaveLength(1);
    expect(Number(data.rows[0].num)).toBe(1);
    expect(data.rows[0].label).toBe('test');
    expect(typeof data.durationMs).toBe('number');
  });
});
