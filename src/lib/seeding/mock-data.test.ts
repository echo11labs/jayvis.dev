import { describe, expect, it } from 'vitest';
import {
  generateMockSeedScript,
  sortTablesByDependency,
} from '@/lib/seeding/mock-data';
import type { DatabaseAST } from '@/types/ast';

const testAST: DatabaseAST = {
  version: '1.0.0',
  tables: {
    users: {
      id: 'users',
      name: 'users',
      fields: [
        {
          id: 'users.id',
          name: 'id',
          type: 'integer',
          constraints: { isPrimaryKey: true, isNullable: false, isUnique: false },
        },
        {
          id: 'users.email',
          name: 'email',
          type: 'varchar',
          constraints: { isPrimaryKey: false, isNullable: false, isUnique: true },
        },
        {
          id: 'users.name',
          name: 'name',
          type: 'varchar',
          constraints: { isPrimaryKey: false, isNullable: false, isUnique: false },
        },
        {
          id: 'users.is_active',
          name: 'is_active',
          type: 'boolean',
          constraints: { isPrimaryKey: false, isNullable: false, isUnique: false },
        },
      ],
      indexes: [],
    },
    orders: {
      id: 'orders',
      name: 'orders',
      fields: [
        {
          id: 'orders.id',
          name: 'id',
          type: 'integer',
          constraints: { isPrimaryKey: true, isNullable: false, isUnique: false },
        },
        {
          id: 'orders.user_id',
          name: 'user_id',
          type: 'integer',
          constraints: { isPrimaryKey: false, isNullable: false, isUnique: false },
        },
        {
          id: 'orders.total_amount',
          name: 'total_amount',
          type: 'decimal',
          constraints: { isPrimaryKey: false, isNullable: false, isUnique: false },
        },
        {
          id: 'orders.status',
          name: 'status',
          type: 'varchar',
          constraints: { isPrimaryKey: false, isNullable: false, isUnique: false },
        },
      ],
      indexes: [],
    },
    order_items: {
      id: 'order_items',
      name: 'order_items',
      fields: [
        {
          id: 'order_items.id',
          name: 'id',
          type: 'integer',
          constraints: { isPrimaryKey: true, isNullable: false, isUnique: false },
        },
        {
          id: 'order_items.order_id',
          name: 'order_id',
          type: 'integer',
          constraints: { isPrimaryKey: false, isNullable: false, isUnique: false },
        },
        {
          id: 'order_items.quantity',
          name: 'quantity',
          type: 'integer',
          constraints: { isPrimaryKey: false, isNullable: false, isUnique: false },
        },
      ],
      indexes: [],
    },
  },
  references: {
    'ref_orders.user_id__users.id': {
      id: 'ref_orders.user_id__users.id',
      sourceTable: 'orders',
      sourceField: 'user_id',
      targetTable: 'users',
      targetField: 'id',
      cardinality: '1:N',
    },
    'ref_order_items.order_id__orders.id': {
      id: 'ref_order_items.order_id__orders.id',
      sourceTable: 'order_items',
      sourceField: 'order_id',
      targetTable: 'orders',
      targetField: 'id',
      cardinality: '1:N',
    },
  },
  enums: {},
  tableGroups: {},
};

describe('sortTablesByDependency', () => {
  it('places parent tables before dependent child tables', () => {
    const order = sortTablesByDependency(testAST);
    const usersIdx = order.indexOf('users');
    const ordersIdx = order.indexOf('orders');
    const itemsIdx = order.indexOf('order_items');

    expect(usersIdx).toBeLessThan(ordersIdx);
    expect(ordersIdx).toBeLessThan(itemsIdx);
  });
});

describe('generateMockSeedScript', () => {
  it('generates the requested number of rows per table', () => {
    const result = generateMockSeedScript(testAST, { count: 3, engine: 'sqlite' });
    expect(result.tables).toHaveLength(3);
    expect(result.totalRows).toBe(9); // 3 tables * 3 rows
    expect(result.tables[0].statements).toHaveLength(3);
  });

  it('formats booleans as 1/0 for sqlite and TRUE/FALSE for postgres', () => {
    const sqliteResult = generateMockSeedScript(testAST, { count: 1, engine: 'sqlite' });
    const postgresResult = generateMockSeedScript(testAST, { count: 1, engine: 'postgres' });

    expect(sqliteResult.fullScript).toContain('PRAGMA foreign_keys = ON;');
    const usersSqlite = sqliteResult.tables.find((t) => t.tableName === 'users')?.sql;
    expect(usersSqlite).toMatch(/,\s*1\);/);

    const usersPostgres = postgresResult.tables.find((t) => t.tableName === 'users')?.sql;
    expect(usersPostgres).toMatch(/,\s*TRUE\);/);
  });

  it('connects child foreign keys to parent generated primary keys', () => {
    const result = generateMockSeedScript(testAST, { count: 3, engine: 'sqlite' });
    const ordersTable = result.tables.find((t) => t.tableName === 'orders');
    expect(ordersTable).toBeDefined();

    // In row 1, user_id should reference users.id = 1
    // In row 2, user_id should reference users.id = 2
    expect(ordersTable?.statements[0]).toContain(', 1, ');
    expect(ordersTable?.statements[1]).toContain(', 2, ');
    expect(ordersTable?.statements[2]).toContain(', 3, ');
  });

  it('generates semantic values for emails and names', () => {
    const result = generateMockSeedScript(testAST, { count: 2, engine: 'sqlite' });
    const usersTable = result.tables.find((t) => t.tableName === 'users');
    expect(usersTable?.statements[0]).toContain("'user1@example.com'");
    expect(usersTable?.statements[1]).toContain("'user2@example.com'");
  });
});
