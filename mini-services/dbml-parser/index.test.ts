import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createParserServer, parseDbml } from './index';

describe('DBML parser mini-service', () => {
  const server = createParserServer();
  let baseUrl = '';

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });

  it('parses a valid schema into matching AST and canvas nodes', () => {
    const result = parseDbml('Table users { id integer [pk] }');
    const users = (
      result.ast.tables as Record<
        string,
        { fields: Array<{ name: string }> }
      >
    ).users;

    expect(result.error).toBeNull();
    expect(users.fields[0].name).toBe('id');
    expect(users.fields[0]).toMatchObject({
      constraints: { isPrimaryKey: true, isNullable: false },
    });
    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(0);
  });

  it('keeps enums and table groups on the AST', () => {
    const result = parseDbml(`
      Enum order_status {
        pending
        paid
      }
      Table orders {
        id integer [pk]
        status order_status
      }
      Table payments {
        id integer [pk]
        order_id integer
      }
      TableGroup checkout {
        orders
        payments
      }
    `);

    expect(result.error).toBeNull();
    expect(result.ast.enums).toMatchObject({
      order_status: { name: 'order_status', values: [{ name: 'pending' }, { name: 'paid' }] },
    });
    expect(result.ast.tableGroups).toMatchObject({
      checkout: { name: 'checkout', tables: ['orders', 'payments'] },
    });
  });

  it('returns a structured parse error for invalid DBML', () => {
    const result = parseDbml('Table users {');

    expect(result.error).toContain("closing brace");
    expect(result.errorLine).toBe(1);
    expect(result.ast.tables).toEqual({});
    expect(result.nodes).toEqual([]);
  });

  it('serves health and parse endpoints over HTTP', async () => {
    const health = await fetch(`${baseUrl}/health`);
    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toMatchObject({
      ok: true,
      service: 'jayvis-dbml-parser',
    });

    const parsed = await fetch(`${baseUrl}/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dbml: 'Table posts { id integer [pk] }',
      }),
    });
    expect(parsed.status).toBe(200);
    await expect(parsed.json()).resolves.toMatchObject({
      error: null,
      ast: { tables: { posts: { name: 'posts' } } },
    });
  });

  it('converts SQL DDL to DBML over /import-sql HTTP endpoint', async () => {
    const res = await fetch(`${baseUrl}/import-sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: 'CREATE TABLE customers (id serial primary key, email text not null);',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; dbml: string };
    expect(body.ok).toBe(true);
    expect(body.dbml).toContain('customers');
    expect(body.dbml).toContain('pk');
  });

  it('disambiguates composite multi-tenant references sharing first column', () => {
    const dbml = `
      Table bundle_edges {
        tenant_id text
        variant_id text
        parent_variant_id text
      }
      Table variants {
        tenant_id text
        id text
      }
      Ref: bundle_edges.(tenant_id, variant_id) > variants.(tenant_id, id)
      Ref: bundle_edges.(tenant_id, parent_variant_id) > variants.(tenant_id, id)
    `;
    const parsed = parseDbml(dbml);
    expect(parsed.error).toBeNull();
    const edgeIds = parsed.edges.map((e) => e.id);
    const uniqueIds = new Set(edgeIds);
    expect(edgeIds.length).toBe(2);
    expect(uniqueIds.size).toBe(2);
    expect(Object.keys(parsed.ast.references).length).toBe(2);
    expect(edgeIds[0]).not.toBe(edgeIds[1]);
  });
});
