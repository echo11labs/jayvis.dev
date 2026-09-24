import { afterEach, describe, expect, it } from 'vitest';
import type { DatabaseAST, SchemaTable } from '@/types/ast';
import { baselineSlot, buildMigration, prepareMigrationAst, readBaseline, writeBaseline } from './migrations';

const memory = new Map<string, string>();

const users: SchemaTable = {
  id: 'users',
  name: 'users',
  fields: [
    {
      id: 'users.id',
      name: 'id',
      type: 'integer',
      constraints: { isPrimaryKey: true, isNullable: false, isAutoincrement: true },
    },
  ],
};

function ast(tables: DatabaseAST['tables'] = {}): DatabaseAST {
  return { version: '1.0', tables, references: {} };
}

describe('migration baselines', () => {
  afterEach(() => {
    memory.clear();
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it('builds a create migration when no baseline is saved', () => {
    const result = buildMigration(null, ast({ users }));
    expect(result.hasBaseline).toBe(false);
    expect(result.summary.tables).toBe(1);
    expect(result.diff.upSql[0]).toContain('CREATE TABLE "users"');
    expect(result.summary.up).toBeGreaterThan(0);
  });

  it('stores a baseline per workspace branch', () => {
    (globalThis as { localStorage?: Storage }).localStorage = {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => {
        memory.set(key, value);
      },
      removeItem: (key) => {
        memory.delete(key);
      },
      clear: () => memory.clear(),
      key: () => null,
      length: 0,
    };
    const slot = baselineSlot('ws-1', 'main');
    writeBaseline(slot, ast({ users }), 10);
    const stored = readBaseline(slot);
    expect(stored?.tables.users.name).toBe('users');
    const result = buildMigration(stored, ast({ users }));
    expect(result.hasBaseline).toBe(true);
    expect(result.summary.up).toBe(0);
  });

  it('uppercases reference actions from the parser', () => {
    const prepared = prepareMigrationAst({
      version: '1.0',
      tables: {},
      references: {
        ref_orders: {
          id: 'ref_orders',
          sourceTable: 'orders',
          sourceField: 'user_id',
          targetTable: 'users',
          targetField: 'id',
          cardinality: '1:N',
          onDelete: 'cascade',
        },
      },
    }) as DatabaseAST;
    expect(prepared.references.ref_orders.onDelete).toBe('CASCADE');
  });
});
