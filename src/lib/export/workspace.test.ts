import { describe, expect, it } from 'vitest';
import type { DatabaseAST, SchemaField, SchemaTable } from '@/types/ast';
import { exportDDL } from './ddl';
import { exportPrisma } from './prisma';
import { exportErdSvg } from './erd-svg';
import { buildExportFile } from './workspace';

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

const posts = table(
  'posts',
  [
    field('posts', 'id', 'integer', { isPrimaryKey: true, isNullable: false }),
    field('posts', 'user_id', 'integer', { isNullable: false }),
  ],
  { indexes: [{ name: 'idx_posts_user', columns: ['user_id'] }] },
);

const withRef = ast({
  tables: { users, posts },
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

describe('export DDL', () => {
  it('emits create table, serial pk, fk, and indexes', () => {
    const sql = exportDDL(withRef);
    expect(sql).toContain('CREATE TABLE "users"');
    expect(sql).toContain('SERIAL PRIMARY KEY');
    expect(sql).toContain('ADD CONSTRAINT "fk_posts_user_id"');
    expect(sql).toContain('ON DELETE CASCADE');
    expect(sql).toContain('CREATE INDEX "idx_posts_user" ON "posts" ("user_id")');
  });

  it('skips empty tables and empty schemas', () => {
    expect(exportDDL(ast())).toContain('-- empty schema');
    expect(
      exportDDL(ast({ tables: { scratch: table('scratch', []) } })),
    ).toContain('-- skipped empty table "scratch"');
  });
});

describe('export Prisma', () => {
  it('emits postgresql models with mapped relations and indexes', () => {
    const prisma = exportPrisma(withRef);
    expect(prisma).toContain('provider = "postgresql"');
    expect(prisma).toContain('model Users {');
    expect(prisma).toContain('model Posts {');
    expect(prisma).toContain('@default(autoincrement())');
    expect(prisma).toContain('onDelete: Cascade');
    expect(prisma).toContain('@@index([user_id], map: "idx_posts_user")');
    expect(prisma).toContain('@@map("posts")');
  });

  it('pascal-cases snake_case tables', () => {
    const prisma = exportPrisma(
      ast({
        tables: {
          order_items: table('order_items', [
            field('order_items', 'id', 'integer', {
              isPrimaryKey: true,
              isNullable: false,
            }),
          ]),
        },
      }),
    );
    expect(prisma).toContain('model OrderItems {');
    expect(prisma).toContain('@@map("order_items")');
  });
});

describe('export workspace files', () => {
  it('builds named files for each format', () => {
    expect(buildExportFile('sql', withRef).filename).toBe('schema.sql');
    expect(buildExportFile('sql', withRef, {}, 'Ecommerce DB').filename).toBe('ecommerce-db.sql');
    expect(buildExportFile('sqlite', withRef).content).toContain('CREATE TABLE "users"');
    expect(buildExportFile('prisma', withRef).filename).toBe('schema.prisma');
    expect(buildExportFile('json', withRef).content).toContain('"users"');
    const svg = exportErdSvg(withRef, {
      users: { x: 0, y: 0 },
      posts: { x: 320, y: 0 },
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('users');
    expect(svg).toContain('posts');
  });
});
