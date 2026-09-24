import { describe, expect, it } from 'vitest';
import type { DatabaseAST, SchemaField, SchemaTable } from '@/types/ast';
import {
  summarizeValidation,
  tableIssueSeverity,
  validateSchema,
} from './schema-validation';

function field(
  table: string,
  name: string,
  type: string,
  constraints: SchemaField['constraints'] = {},
): SchemaField {
  return {
    id: `${table}.${name}`,
    name,
    type,
    constraints,
  };
}

function table(
  name: string,
  fields: SchemaField[],
  extra: Partial<SchemaTable> = {},
): SchemaTable {
  return { id: name, name, fields, ...extra };
}

function ast(partial: Partial<DatabaseAST> = {}): DatabaseAST {
  return {
    version: '1.0',
    tables: {},
    references: {},
    ...partial,
  };
}

function ids(issues: ReturnType<typeof validateSchema>): string[] {
  return issues.map((issue) => issue.id);
}

describe('schema validation', () => {
  it('reports an empty schema as info', () => {
    const issues = validateSchema(ast());
    expect(issues[0]?.id).toBe('empty-schema');
    expect(issues[0]?.severity).toBe('info');
    const summary = summarizeValidation(ast());
    expect(summary.errors).toBe(0);
    expect(summary.warnings).toBe(0);
    expect(summary.infos).toBe(1);
    expect(summary.checks.find((check) => check.id === 'schema-not-empty')).toMatchObject({
      status: 'fail',
      count: 1,
    });
  });

  it('flags missing primary keys and empty tables', () => {
    const issues = validateSchema(
      ast({
        tables: {
          logs: table('logs', [field('logs', 'body', 'text', { isNullable: true })]),
          scratch: table('scratch', []),
        },
      }),
    );

    expect(ids(issues)).toContain('no-pk-logs');
    expect(ids(issues)).toContain('empty-table-scratch');
    expect(tableIssueSeverity(issues, 'scratch')).toBe('error');
    expect(tableIssueSeverity(issues, 'logs')).toBe('warning');
    expect(issues[0]?.severity).toBe('error');
  });

  it('detects duplicate columns, missing index columns, and orphan refs', () => {
    const schema = ast({
      tables: {
        users: table('users', [
          field('users', 'id', 'integer', { isPrimaryKey: true, isNullable: false }),
          field('users', 'email', 'text'),
          { id: 'users.email-dup', name: 'email', type: 'text', constraints: {} },
        ]),
        posts: table(
          'posts',
          [
            field('posts', 'id', 'uuid', { isPrimaryKey: true, isNullable: false }),
            field('posts', 'user_id', 'text'),
          ],
          { indexes: [{ columns: ['missing_col'] }] },
        ),
      },
      references: {
        'ref_posts.user_id__users.id': {
          id: 'ref_posts.user_id__users.id',
          sourceTable: 'posts',
          sourceField: 'user_id',
          targetTable: 'users',
          targetField: 'id',
          cardinality: '1:N',
        },
        'ref_ghost.x__users.id': {
          id: 'ref_ghost.x__users.id',
          sourceTable: 'ghost',
          sourceField: 'x',
          targetTable: 'users',
          targetField: 'id',
          cardinality: '1:N',
        },
      },
    });

    const issues = validateSchema(schema);
    const issueIds = ids(issues);

    expect(issueIds).toContain('dup-col-users-email');
    expect(issueIds).toContain('orphan-ref-src-ref_ghost.x__users.id');
    expect(issueIds).toContain('fk-type-ref_posts.user_id__users.id');
    expect(issueIds).toContain('index-missing-posts-missing_col');
    expect(issues.find((issue) => issue.id.startsWith('orphan-ref'))?.refId).toBe(
      'ref_ghost.x__users.id',
    );

    const summary = summarizeValidation(schema);
    expect(summary.errors).toBeGreaterThan(0);
    expect(summary.warnings).toBeGreaterThan(0);
    expect(summary.issues).toHaveLength(issues.length);
  });

  it('warns on reserved names, non-snake_case, duplicate refs, and non-unique FK targets', () => {
    const schema = ast({
      tables: {
        user: table('user', [
          field('user', 'id', 'integer', { isPrimaryKey: true, isNullable: false }),
          field('user', 'email', 'text'),
        ]),
        OrderItems: table('OrderItems', [
          field('OrderItems', 'id', 'integer', { isPrimaryKey: true, isNullable: false }),
          field('OrderItems', 'userId', 'integer'),
          field('OrderItems', 'email', 'text'),
        ]),
      },
      references: {
        ref_a: {
          id: 'ref_a',
          sourceTable: 'OrderItems',
          sourceField: 'userId',
          targetTable: 'user',
          targetField: 'id',
          cardinality: '1:N',
        },
        ref_b: {
          id: 'ref_b',
          sourceTable: 'OrderItems',
          sourceField: 'userId',
          targetTable: 'user',
          targetField: 'id',
          cardinality: '1:N',
        },
        ref_email: {
          id: 'ref_email',
          sourceTable: 'OrderItems',
          sourceField: 'email',
          targetTable: 'user',
          targetField: 'email',
          cardinality: '1:N',
        },
      },
    });

    const issueIds = ids(validateSchema(schema));
    expect(issueIds).toContain('reserved-table-user');
    expect(issueIds).toContain('ident-table-OrderItems');
    expect(issueIds).toContain('ident-col-OrderItems-userId');
    expect(issueIds).toContain('dup-ref-ref_b');
    expect(issueIds).toContain('fk-target-unique-ref_email');
  });

  it('treats serial and integer as matching FK types', () => {
    const issues = validateSchema(
      ast({
        tables: {
          users: table('users', [
            field('users', 'id', 'integer', { isPrimaryKey: true, isNullable: false }),
          ]),
          posts: table('posts', [
            field('posts', 'id', 'serial', { isPrimaryKey: true, isNullable: false }),
            field('posts', 'user_id', 'serial'),
          ]),
        },
        references: {
          ref_posts: {
            id: 'ref_posts',
            sourceTable: 'posts',
            sourceField: 'user_id',
            targetTable: 'users',
            targetField: 'id',
            cardinality: '1:N',
          },
        },
      }),
    );

    expect(ids(issues).some((id) => id.startsWith('fk-type-'))).toBe(false);
  });

  it('warns on an explicitly nullable PK, but not autoincrement PKs', () => {
    const issues = validateSchema(
      ast({
        tables: {
          users: table('users', [
            field('users', 'id', 'integer', {
              isPrimaryKey: true,
              isNullable: true,
              isAutoincrement: true,
            }),
          ]),
          tokens: table('tokens', [
            field('tokens', 'id', 'uuid', {
              isPrimaryKey: true,
              isNullable: true,
            }),
          ]),
        },
      }),
    );
    const issueIds = ids(issues);
    expect(issueIds).toContain('pk-nullable-tokens-id');
    expect(issueIds).not.toContain('pk-nullable-users-id');
  });

  it('passes every check for a minimal valid table', () => {
    const summary = summarizeValidation(
      ast({
        tables: {
          users: table('users', [
            field('users', 'id', 'integer', { isPrimaryKey: true, isNullable: false }),
          ]),
        },
      }),
    );

    expect(summary.issues).toEqual([]);
    expect(summary.errors).toBe(0);
    expect(summary.warnings).toBe(0);
    expect(summary.infos).toBe(0);
    expect(summary.checks.length).toBeGreaterThan(0);
    expect(summary.checks.every((check) => check.status === 'pass' && check.count === 0)).toBe(true);
  });

  it('flags a duplicate index', () => {
    const issues = validateSchema(
      ast({
        tables: {
          users: table(
            'users',
            [field('users', 'email', 'text', { isPrimaryKey: true, isNullable: false })],
            { indexes: [{ columns: ['email'] }, { name: 'users_email_idx', columns: ['email'] }] },
          ),
        },
      }),
    );
    expect(ids(issues)).toContain('dup-index-users-email');
    expect(issues.find((issue) => issue.id === 'dup-index-users-email')?.checkId).toBe(
      'index-not-duplicate',
    );
  });

  it('notes a foreign key with no index', () => {
    const issues = validateSchema(
      ast({
        tables: {
          users: table('users', [
            field('users', 'id', 'integer', { isPrimaryKey: true, isNullable: false }),
          ]),
          posts: table('posts', [
            field('posts', 'id', 'integer', { isPrimaryKey: true, isNullable: false }),
            field('posts', 'user_id', 'integer'),
          ]),
        },
        references: {
          ref_posts: {
            id: 'ref_posts',
            sourceTable: 'posts',
            sourceField: 'user_id',
            targetTable: 'users',
            targetField: 'id',
            cardinality: '1:N',
          },
        },
      }),
    );
    const issue = issues.find((item) => item.id === 'fk-index-ref_posts');
    expect(issue).toMatchObject({ checkId: 'fk-indexed', severity: 'info', fieldName: 'user_id' });
  });

  it('rejects SET NULL on a NOT NULL column', () => {
    const issues = validateSchema(
      ast({
        tables: {
          users: table('users', [
            field('users', 'id', 'integer', { isPrimaryKey: true, isNullable: false }),
          ]),
          posts: table(
            'posts',
            [
              field('posts', 'id', 'integer', { isPrimaryKey: true, isNullable: false }),
              field('posts', 'user_id', 'integer', { isNullable: false }),
            ],
            { indexes: [{ columns: ['user_id'] }] },
          ),
        },
        references: {
          ref_posts: {
            id: 'ref_posts',
            sourceTable: 'posts',
            sourceField: 'user_id',
            targetTable: 'users',
            targetField: 'id',
            cardinality: '1:N',
            onDelete: 'SET NULL',
          },
        },
      }),
    );
    expect(issues.find((issue) => issue.id === 'set-null-ref_posts')).toMatchObject({
      checkId: 'ref-set-null',
      severity: 'error',
    });
  });

  it('warns when a one-to-one source is not unique', () => {
    const issues = validateSchema(
      ast({
        tables: {
          users: table('users', [
            field('users', 'id', 'integer', { isPrimaryKey: true, isNullable: false }),
          ]),
          profiles: table(
            'profiles',
            [
              field('profiles', 'id', 'integer', { isPrimaryKey: true, isNullable: false }),
              field('profiles', 'user_id', 'integer'),
            ],
            { indexes: [{ columns: ['user_id'] }] },
          ),
        },
        references: {
          ref_profiles: {
            id: 'ref_profiles',
            sourceTable: 'profiles',
            sourceField: 'user_id',
            targetTable: 'users',
            targetField: 'id',
            cardinality: '1:1',
          },
        },
      }),
    );
    expect(issues.find((issue) => issue.id === 'cardinality-ref_profiles')).toMatchObject({
      checkId: 'ref-cardinality',
      severity: 'warning',
    });
  });

  it('warns on an unknown column type', () => {
    const issues = validateSchema(
      ast({
        tables: {
          users: table('users', [
            field('users', 'id', 'integer', { isPrimaryKey: true, isNullable: false }),
            field('users', 'email', 'citext'),
          ]),
        },
      }),
    );
    expect(issues.find((issue) => issue.id === 'unknown-type-users-email')).toMatchObject({
      checkId: 'known-type',
      severity: 'warning',
    });
  });

  it('accepts a declared enum as a column type and flags enum and group problems', () => {
    const issues = validateSchema(
      ast({
        tables: {
          users: table('users', [
            field('users', 'id', 'integer', { isPrimaryKey: true, isNullable: false }),
            field('users', 'status', 'order_status'),
          ]),
        },
        enums: {
          order_status: {
            name: 'order_status',
            values: [{ name: 'open' }, { name: 'open' }],
          },
          empty_state: { name: 'empty_state', values: [] },
        },
        tableGroups: {
          core: { name: 'core', tables: ['users', 'missing'] },
        },
      }),
    );
    expect(issues.some((issue) => issue.id === 'unknown-type-users-status')).toBe(false);
    expect(issues.find((issue) => issue.checkId === 'enum-values-unique')?.message).toContain('order_status');
    expect(issues.find((issue) => issue.checkId === 'enum-has-values')?.message).toContain('empty_state');
    expect(issues.find((issue) => issue.checkId === 'group-tables-exist')?.message).toContain('missing');
  });
});
