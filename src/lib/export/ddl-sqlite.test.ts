import { describe, expect, it } from 'vitest';
import type { DatabaseAST, SchemaTable } from '@/types/ast';
import { buildSqlStatements } from './ddl-sqlite';

const organizations: SchemaTable = {
  id: 'organizations',
  name: 'organizations',
  fields: [
    {
      id: 'organizations.id',
      name: 'id',
      type: 'text',
      constraints: { isPrimaryKey: true, isNullable: false },
    },
    {
      id: 'organizations.created_at',
      name: 'created_at',
      type: 'timestamptz',
      constraints: { defaultValue: "'now()'" },
    },
  ],
};

const members: SchemaTable = {
  id: 'members',
  name: 'members',
  fields: [
    {
      id: 'members.org_id',
      name: 'org_id',
      type: 'text',
      constraints: { isNullable: false },
    },
  ],
};

function ast(): DatabaseAST {
  return {
    version: '1.0',
    tables: { organizations, members },
    references: {
      ref_members: {
        id: 'ref_members',
        sourceTable: 'members',
        sourceField: 'org_id',
        targetTable: 'organizations',
        targetField: 'id',
        cardinality: '1:N',
        onDelete: 'cascade' as 'CASCADE',
      },
    },
  };
}

describe('sqlite ddl', () => {
  it('emits plain SQL with sqlite defaults and uppercase actions', () => {
    const sql = buildSqlStatements(ast())
      .map((statement) => statement.sql)
      .join('\n');
    expect(sql).toContain("DEFAULT (datetime('now'))");
    expect(sql).toContain('ON DELETE CASCADE');
    expect(sql).not.toContain('600">');
    expect(sql).not.toContain('<span');
  });

  it('quotes unsafe defaults instead of interpolating them', () => {
    const poisoned = ast();
    poisoned.tables.organizations = {
      ...organizations,
      fields: organizations.fields.map((field, index) =>
        index === 1
          ? {
              ...field,
              constraints: { defaultValue: '1); DROP TABLE users' },
            }
          : field,
      ),
    };
    const sql = buildSqlStatements(poisoned)
      .map((statement) => statement.sql)
      .join('\n');
    expect(sql).toContain("DEFAULT '1); DROP TABLE users'");
    expect(sql).not.toContain('DROP TABLE users;');
  });
});
