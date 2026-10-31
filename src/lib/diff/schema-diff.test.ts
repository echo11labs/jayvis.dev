import { describe, expect, it } from 'vitest';
import type { DatabaseAST, SchemaField, SchemaTable } from '@/types/ast';
import { diffSchema, summarizeDiff } from './schema-diff';

function field(
  table: string,
  name: string,
  type: string,
  constraints: SchemaField['constraints'] = {},
): SchemaField {
  return { id: `${table}.${name}`, name, type, constraints };
}

function table(
  name: string,
  fields: SchemaField[],
  extra: Partial<SchemaTable> = {},
): SchemaTable {
  return { id: name, name, fields, ...extra };
}

function ast(partial: Partial<DatabaseAST> = {}): DatabaseAST {
  return { version: '1.0', tables: {}, references: {}, ...partial };
}

const users = table('users', [
  field('users', 'id', 'integer', {
    isPrimaryKey: true,
    isNullable: false,
    isAutoincrement: true,
  }),
  field('users', 'email', 'text', { isUnique: true, isNullable: false }),
]);

describe('schema diff', () => {
  it('returns empty SQL when schemas match', () => {
    const snapshot = ast({ tables: { users } });
    const result = diffSchema(snapshot, snapshot);
    expect(result.tables).toEqual([]);
    expect(result.upSql).toEqual([]);
    expect(summarizeDiff(result)).toEqual({
      tables: 0,
      indexes: 0,
      references: 0,
      up: 0,
      down: 0,
      hazards: 0,
    });
  });

  it('creates and drops tables with matching down SQL', () => {
    const empty = ast();
    const created = diffSchema(empty, ast({ tables: { users } }));
    expect(created.tables[0]?.action).toBe('CREATE');
    expect(created.upSql[0]).toContain('CREATE TABLE "users"');
    expect(created.upSql[0]).toContain('SERIAL');
    expect(created.downSql[0]).toBe('DROP TABLE IF EXISTS "users" CASCADE;');

    const dropped = diffSchema(ast({ tables: { users } }), empty);
    expect(dropped.tables[0]?.action).toBe('DROP');
    expect(dropped.upSql.at(-1)).toBe('DROP TABLE IF EXISTS "users" CASCADE;');
    expect(dropped.downSql[0]).toContain('CREATE TABLE "users"');
  });

  it('adds, drops, and alters columns', () => {
    const before = ast({ tables: { users } });
    const after = ast({
      tables: {
        users: table('users', [
          field('users', 'id', 'integer', {
            isPrimaryKey: true,
            isNullable: false,
            isAutoincrement: true,
          }),
          field('users', 'email', 'varchar', { isUnique: true, isNullable: false }),
          field('users', 'bio', 'text'),
        ]),
      },
    });

    const result = diffSchema(before, after);
    const alter = result.tables.find((diff) => diff.action === 'ALTER');
    expect(alter?.columnDiffs.map((diff) => `${diff.action}:${diff.columnName}`)).toEqual(
      ['ALTER:email', 'CREATE:bio'],
    );
    expect(result.upSql.some((sql) => sql.includes('ADD COLUMN "bio"'))).toBe(true);
    expect(result.upSql.some((sql) => sql.includes('ALTER COLUMN "email" TYPE varchar'))).toBe(
      true,
    );
  });

  it('diffs indexes and foreign keys', () => {
    const before = ast({ tables: { users } });
    const posts = table(
      'posts',
      [
        field('posts', 'id', 'integer', { isPrimaryKey: true, isNullable: false }),
        field('posts', 'user_id', 'integer', { isNullable: false }),
      ],
      { indexes: [{ name: 'idx_posts_user', columns: ['user_id'] }] },
    );
    const after = ast({
      tables: {
        users,
        posts,
      },
      references: {
        ref_posts: {
          id: 'ref_posts',
          sourceTable: 'posts',
          sourceField: 'user_id',
          targetTable: 'users',
          targetField: 'id',
          cardinality: '1:N',
          onDelete: 'CASCADE',
        },
      },
    });

    const result = diffSchema(before, after);
    expect(result.tables.some((diff) => diff.action === 'CREATE' && diff.tableName === 'posts')).toBe(
      true,
    );
    expect(result.indexes.some((diff) => diff.action === 'CREATE' && diff.indexName === 'idx_posts_user')).toBe(
      true,
    );
    expect(result.references.some((diff) => diff.action === 'CREATE' && diff.refId === 'ref_posts')).toBe(
      true,
    );
    expect(result.upSql.findIndex((sql) => sql.startsWith('CREATE TABLE "posts"'))).toBeLessThan(
      result.upSql.findIndex((sql) => sql.includes('ADD CONSTRAINT "fk_posts_user_id"')),
    );
    expect(result.upSql.some((sql) => sql.includes('CREATE INDEX "idx_posts_user"'))).toBe(true);
  });

  it('handles composite primary keys, table uniques, and check constraints in createTableSql without duplicate inline PKs', () => {
    const orderItems = table(
      'order_items',
      [
        field('order_items', 'order_id', 'integer', { isPrimaryKey: true, isNullable: false }),
        field('order_items', 'product_id', 'integer', { isPrimaryKey: true, isNullable: false }),
        field('order_items', 'quantity', 'integer', { defaultValue: '1' }),
        field('order_items', 'price', 'decimal(10,2)', { isNullable: false }),
      ],
      {
        primaryKey: ['order_id', 'product_id'],
        uniques: [{ name: 'uniq_order_prod', columns: ['order_id', 'product_id'] }],
        checks: ['price > 0'],
      },
    );

    const empty = ast();
    const created = diffSchema(empty, ast({ tables: { order_items: orderItems } }));
    const createSql = created.upSql[0];

    // Table constraint emitted
    expect(createSql).toContain('PRIMARY KEY ("order_id", "product_id")');
    expect(createSql).toContain('CONSTRAINT "uniq_order_prod" UNIQUE ("order_id", "product_id")');
    expect(createSql).toContain('CHECK (price > 0)');

    // Columns themselves must NOT have inline PRIMARY KEY attached
    expect(createSql).not.toContain('"order_id" integer PRIMARY KEY');
    expect(createSql).not.toContain('"product_id" integer PRIMARY KEY');

    // Down SQL drops the table cleanly
    expect(created.downSql[0]).toBe('DROP TABLE IF EXISTS "order_items" CASCADE;');
  });

  it('supports parameterized and custom types like char(3), varchar(255), and decimal(10,2) in migration diffs', () => {
    const accounts = table('accounts', [
      field('accounts', 'id', 'uuid', { isPrimaryKey: true, isNullable: false }),
      field('accounts', 'currency', 'char(3)', { defaultValue: "'USD'" }),
      field('accounts', 'balance', 'decimal(12,2)', { defaultValue: '0.0' }),
    ]);

    const result = diffSchema(ast(), ast({ tables: { accounts } }));
    const sql = result.upSql[0];

    expect(sql).toContain('"currency" char(3) DEFAULT \'USD\'');
    expect(sql).toContain('"balance" decimal(12, 2) DEFAULT 0.0');
    expect(sql).toContain('"id" uuid PRIMARY KEY');
  });

  it('disambiguates foreign key constraint names for multi-tenant tables and never produces duplicate DROP CONSTRAINT statements', () => {
    const tenants = table('tenants', [
      field('tenants', 'id', 'uuid', { isPrimaryKey: true, isNullable: false }),
    ]);
    const workflows = table('workflows', [
      field('workflows', 'tenant_id', 'uuid', { isPrimaryKey: true, isNullable: false }),
      field('workflows', 'id', 'uuid', { isPrimaryKey: true, isNullable: false }),
    ], { primaryKey: ['tenant_id', 'id'] });
    const triggers = table('triggers', [
      field('triggers', 'tenant_id', 'uuid', { isPrimaryKey: true, isNullable: false }),
      field('triggers', 'id', 'uuid', { isPrimaryKey: true, isNullable: false }),
    ], { primaryKey: ['tenant_id', 'id'] });
    const workflowExecutions = table('workflow_executions', [
      field('workflow_executions', 'id', 'uuid', { isPrimaryKey: true, isNullable: false }),
      field('workflow_executions', 'tenant_id', 'uuid', { isNullable: false }),
      field('workflow_executions', 'workflow_id', 'uuid', { isNullable: false }),
      field('workflow_executions', 'trigger_id', 'uuid', { isNullable: false }),
    ]);

    const current = ast({
      tables: {
        tenants,
        workflows,
        triggers,
        workflow_executions: workflowExecutions,
      },
      references: {
        ref_tenant: {
          id: 'ref_tenant',
          sourceTable: 'workflow_executions',
          sourceField: 'tenant_id',
          targetTable: 'tenants',
          targetField: 'id',
          cardinality: '1:N',
        },
        ref_workflow: {
          id: 'ref_workflow',
          sourceTable: 'workflow_executions',
          sourceField: 'tenant_id',
          sourceFields: ['tenant_id', 'workflow_id'],
          targetTable: 'workflows',
          targetField: 'tenant_id',
          targetFields: ['tenant_id', 'id'],
          cardinality: '1:N',
        },
        ref_trigger: {
          id: 'ref_trigger',
          sourceTable: 'workflow_executions',
          sourceField: 'tenant_id',
          sourceFields: ['tenant_id', 'trigger_id'],
          targetTable: 'triggers',
          targetField: 'tenant_id',
          targetFields: ['tenant_id', 'id'],
          cardinality: '1:N',
        },
      },
    });

    const diff = diffSchema(ast(), current);

    // Verify all downSql statements are unique
    const dropConstraints = diff.downSql.filter((s) => s.includes('DROP CONSTRAINT'));
    expect(dropConstraints.length).toBe(3);
    const uniqueDrops = new Set(dropConstraints);
    expect(uniqueDrops.size).toBe(dropConstraints.length);

    // Verify UP SQL constraint names are completely unique
    const addConstraints = diff.upSql.filter((s) => s.includes('ADD CONSTRAINT'));
    expect(addConstraints.length).toBe(3);
    const uniqueAdds = new Set(addConstraints);
    expect(uniqueAdds.size).toBe(addConstraints.length);

    // Verify constraint names contain composite source or target table disambiguation
    expect(diff.upSql.some((s) => s.includes('fk_workflow_executions_tenant_id__tenants_id') || s.includes('fk_workflow_executions_tenant_id'))).toBe(true);
    expect(diff.upSql.some((s) => s.includes('fk_workflow_executions_tenant_id_workflow_id'))).toBe(true);
    expect(diff.upSql.some((s) => s.includes('fk_workflow_executions_tenant_id_trigger_id'))).toBe(true);
  });

  it('detects destructive hazards on table and column drops', () => {
    const prev = ast({
      tables: {
        users: table('users', [
          field('users', 'id', 'integer', { isPrimaryKey: true }),
          field('users', 'email', 'text'),
          field('users', 'bio', 'text'),
        ]),
        posts: table('posts', [
          field('posts', 'id', 'integer', { isPrimaryKey: true }),
        ]),
      },
    });

    const curr = ast({
      tables: {
        users: table('users', [
          field('users', 'id', 'integer', { isPrimaryKey: true }),
          field('users', 'email', 'varchar(255)'), // type change
          // bio dropped
        ]),
        // posts table dropped
      },
    });

    const result = diffSchema(prev, curr);
    expect(result.hazards).toBeDefined();
    expect(result.hazards!.length).toBe(3);

    const tableDropHazard = result.hazards!.find((h) => h.id === 'drop-table-posts');
    expect(tableDropHazard).toBeDefined();
    expect(tableDropHazard?.level).toBe('danger');
    expect(tableDropHazard?.tableName).toBe('posts');

    const colDropHazard = result.hazards!.find((h) => h.id === 'drop-column-users-bio');
    expect(colDropHazard).toBeDefined();
    expect(colDropHazard?.level).toBe('danger');
    expect(colDropHazard?.columnName).toBe('bio');

    const typeChangeHazard = result.hazards!.find((h) => h.id === 'type-change-users-email');
    expect(typeChangeHazard).toBeDefined();
    expect(typeChangeHazard?.level).toBe('warning');
    expect(typeChangeHazard?.columnName).toBe('email');

    const summary = summarizeDiff(result);
    expect(summary.hazards).toBe(3);
  });

  it('generates SQLite-compatible migration statements when engine is sqlite', () => {
    const prev = ast({
      tables: {
        users: table('users', [
          field('users', 'id', 'integer', { isPrimaryKey: true }),
        ]),
      },
    });
    const curr = ast();

    const sqliteDiff = diffSchema(prev, curr, { engine: 'sqlite' });
    expect(sqliteDiff.upSql.at(-1)).toBe('DROP TABLE IF EXISTS "users";');
    expect(sqliteDiff.upSql.some((s) => s.includes('CASCADE'))).toBe(false);

    const postgresDiff = diffSchema(prev, curr, { engine: 'postgres' });
    expect(postgresDiff.upSql.at(-1)).toBe('DROP TABLE IF EXISTS "users" CASCADE;');
  });
});

