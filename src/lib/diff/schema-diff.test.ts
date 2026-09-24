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
});
