import { describe, expect, it } from 'vitest';
import {
  positionsCollapsed,
  estimateNodeDimensions,
  compactColumnVoids,
} from './elk-layout';

describe('positionsCollapsed', () => {
  it('is true when tables share one point', () => {
    expect(
      positionsCollapsed([
        { position: { x: 0, y: 0 } },
        { position: { x: 0, y: 0 } },
      ]),
    ).toBe(true);
  });

  it('is false when tables are already placed apart', () => {
    expect(
      positionsCollapsed([
        { position: { x: 0, y: 0 } },
        { position: { x: 320, y: 40 } },
      ]),
    ).toBe(false);
  });
});

describe('estimateNodeDimensions', () => {
  it('calculates height based on field count when unmeasured', () => {
    const node: any = {
      id: 'users',
      position: { x: 0, y: 0 },
      data: {
        table: {
          name: 'users',
          fields: [
            { name: 'id', constraints: { isPrimaryKey: true } },
            { name: 'email', constraints: {} },
            { name: 'created_at', constraints: {} },
          ],
        },
      },
    };
    const dims = estimateNodeDimensions(node);
    expect(dims.width).toBe(320);
    // 42 header + 3 * 36 rows + 4 borders = 154
    expect(dims.height).toBe(154);
  });

  it('respects measured dimensions if already available from DOM', () => {
    const node: any = {
      id: 'posts',
      position: { x: 0, y: 0 },
      measured: { width: 340, height: 260 },
      data: { table: { name: 'posts', fields: [] } },
    };
    const dims = estimateNodeDimensions(node);
    expect(dims.width).toBe(340);
    expect(dims.height).toBe(260);
  });
});

describe('compactColumnVoids', () => {
  it('compacts vertical voids within columns starting at startCoord', () => {
    const nodes = [
      { id: 't0', x: 12, y: 1500, width: 320, height: 160 },
      { id: 't1', x: 12, y: 3500, width: 320, height: 200 },
      { id: 't2', x: 450, y: 2200, width: 320, height: 180 },
    ];

    const compacted = compactColumnVoids(nodes, 'RIGHT', 36, 90, 24);

    // Column 0: t0 should be at y=24, t1 should be at y=24+160+36 = 220
    const t0 = compacted.find((n) => n.id === 't0')!;
    const t1 = compacted.find((n) => n.id === 't1')!;
    const t2 = compacted.find((n) => n.id === 't2')!;

    expect(t0.x).toBe(24);
    expect(t0.y).toBe(24);
    expect(t1.x).toBe(24);
    expect(t1.y).toBe(220);

    // Column 1: t2 should be at x = 24 + 320 + 90 = 434, y = 24
    expect(t2.x).toBe(434);
    expect(t2.y).toBe(24);
  });

  it('guarantees 0 overlaps between any two nodes', () => {
    const nodes = Array.from({ length: 20 }, (_, i) => ({
      id: `n${i}`,
      x: (i % 4) * 450,
      y: Math.random() * 5000,
      width: 320,
      height: 120 + (i % 5) * 30,
    }));

    const compacted = compactColumnVoids(nodes, 'RIGHT', 36, 90, 24);

    for (let i = 0; i < compacted.length; i++) {
      for (let j = i + 1; j < compacted.length; j++) {
        const a = compacted[i];
        const b = compacted[j];
        const xOverlap = a.x < b.x + b.width && a.x + a.width > b.x;
        const yOverlap = a.y < b.y + b.height && a.y + a.height > b.y;
        expect(xOverlap && yOverlap).toBe(false);
      }
    }
  });
});

describe('layoutDiagram with grouping', () => {
  it('clusters nodes by tableGroups into pods when groupByDomain is true', async () => {
    const { layoutDiagram } = await import('./elk-layout');
    const nodes: any[] = [
      { id: 'users', position: { x: 0, y: 0 }, data: { table: { name: 'users', fields: [{ name: 'id' }] } } },
      { id: 'roles', position: { x: 0, y: 0 }, data: { table: { name: 'roles', fields: [{ name: 'id' }] } } },
      { id: 'invoices', position: { x: 0, y: 0 }, data: { table: { name: 'invoices', fields: [{ name: 'id' }] } } },
      { id: 'payments', position: { x: 0, y: 0 }, data: { table: { name: 'payments', fields: [{ name: 'id' }] } } },
    ];
    const edges: any[] = [
      { id: 'e1', source: 'users', target: 'roles' },
      { id: 'e2', source: 'invoices', target: 'payments' },
    ];
    const tableGroups = {
      auth: { name: 'auth', tables: ['users', 'roles'] },
      billing: { name: 'billing', tables: ['invoices', 'payments'] },
    };

    const res = await layoutDiagram(nodes, edges, {
      groupByDomain: true,
      tableGroups,
    });

    expect(res.nodes.length).toBe(4);
    const userNode = res.nodes.find((n) => n.id === 'users')!;
    const roleNode = res.nodes.find((n) => n.id === 'roles')!;
    const invNode = res.nodes.find((n) => n.id === 'invoices')!;
    const payNode = res.nodes.find((n) => n.id === 'payments')!;

    // Auth nodes are within their pod bounds
    expect(Math.abs(userNode.position.x - roleNode.position.x)).toBeLessThan(800);
    // Billing nodes are within their pod bounds
    expect(Math.abs(invNode.position.x - payNode.position.x)).toBeLessThan(800);
  });
});

