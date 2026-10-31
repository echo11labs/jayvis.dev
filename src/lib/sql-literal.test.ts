import { describe, it, expect } from 'vitest';
import { storedType, columnSql, baseType, SqlBuildError } from '@/lib/sql-literal';
import { diffSchema } from '@/lib/diff/schema-diff';
import { buildMigration } from '@/lib/migrations';
import { validateSchema } from '@/lib/validation/schema-validation';
import type { DatabaseAST } from '@/types/ast';

describe('storedType and SQL type handling', () => {
  it('correctly handles char(3) for PostgreSQL without throwing SqlBuildError', () => {
    const result = storedType('postgres', 'char(3)', 'default_currency');
    expect(result.sql).toBe('char(3)');
    expect(result.note).toBeNull();
  });

  it('correctly maps char(3) to TEXT on SQLite with affinity note', () => {
    const result = storedType('sqlite', 'char(3)', 'default_currency');
    expect(result.sql).toBe('TEXT');
    expect(result.note).toContain('default_currency char(3) stored as TEXT');
  });

  it('handles parameterized types with single and multi parameters in Postgres', () => {
    expect(storedType('postgres', 'varchar(255)', 'title').sql).toBe('varchar(255)');
    expect(storedType('postgres', 'decimal(10, 2)', 'price').sql).toBe('decimal(10, 2)');
    expect(storedType('postgres', 'numeric(12,4)', 'amount').sql).toBe('numeric(12, 4)');
    expect(storedType('postgres', 'vector(1536)', 'embedding').sql).toBe('vector(1536)');
    expect(storedType('postgres', 'bit(8)', 'flags').sql).toBe('bit(8)');
  });

  it('handles array types for PostgreSQL and SQLite', () => {
    const pgArray = storedType('postgres', 'text[]', 'tags');
    expect(pgArray.sql).toBe('text[]');

    const sqliteArray = storedType('sqlite', 'text[]', 'tags');
    expect(sqliteArray.sql).toBe('TEXT');
  });

  it('handles registered enum types', () => {
    const enums = new Set(['order_status']);
    const pgResult = storedType('postgres', 'order_status', 'status', enums);
    expect(pgResult.sql).toBe('"order_status"');

    const sqliteResult = storedType('sqlite', 'order_status', 'status', enums);
    expect(sqliteResult.sql).toBe('TEXT');
  });

  it('handles custom unlisted domain or extension types safely without throwing', () => {
    const pgResult = storedType('postgres', 'citext', 'email');
    expect(pgResult.sql).toBe('citext');

    const customType = storedType('postgres', 'custom_geometry', 'geo');
    expect(customType.sql).toBe('custom_geometry');
  });

  it('throws SqlBuildError when malicious statement delimiters are injected', () => {
    expect(() => storedType('postgres', 'text; DROP TABLE users;', 'col')).toThrow(SqlBuildError);
    expect(() => storedType('postgres', 'text -- comment', 'col')).toThrow(SqlBuildError);
    expect(() => storedType('postgres', 'text /* inline */', 'col')).toThrow(SqlBuildError);
  });

  it('correctly extracts baseType for parameterized and array types', () => {
    expect(baseType('char(3)')).toBe('char');
    expect(baseType('varchar(255)')).toBe('varchar');
    expect(baseType('numeric(10, 2)')).toBe('numeric');
    expect(baseType('text[]')).toBe('text');
    expect(baseType('integer[]')).toBe('integer');
  });
});

describe('columnSql generator', () => {
  it('generates valid DDL for char(3) columns', () => {
    const ddl = columnSql('postgres', {
      id: 'f1',
      name: 'default_currency',
      type: 'char(3)',
      constraints: {
        isPrimaryKey: false,
        isNullable: false,
        defaultValue: "'USD'",
      },
    });
    expect(ddl.sql).toBe('"default_currency" char(3) NOT NULL DEFAULT \'USD\'');
  });
});

describe('diffSchema and buildMigration resilience with char(3)', () => {
  const previousAST: DatabaseAST = {
    version: '1.0',
    tables: {},
    references: {},
  };

  const currentAST: DatabaseAST = {
    version: '1.0',
    tables: {
      organizations: {
        id: 't1',
        name: 'organizations',
        fields: [
          {
            id: 'c1',
            name: 'id',
            type: 'uuid',
            constraints: { isPrimaryKey: true, isNullable: false },
          },
          {
            id: 'c2',
            name: 'default_currency',
            type: 'char(3)',
            constraints: { isNullable: false, defaultValue: "'USD'" },
          },
        ],
      },
    },
    references: {},
  };

  it('generates migration DDL containing char(3) without throwing', () => {
    const diff = diffSchema(previousAST, currentAST);
    expect(diff.tables).toHaveLength(1);
    expect(diff.upSql.some((stmt) => stmt.includes('char(3)'))).toBe(true);
  });

  it('buildMigration succeeds and returns up statements count', () => {
    const migration = buildMigration(previousAST, currentAST);
    expect(migration.hasBaseline).toBe(true);
    expect(migration.summary.up).toBeGreaterThan(0);
    expect(migration.error).toBeUndefined();
  });
});

describe('validateSchema with char(3)', () => {
  it('does not produce unknown-type warning for char(3)', () => {
    const ast: DatabaseAST = {
      version: '1.0',
      tables: {
        accounts: {
          id: 't1',
          name: 'accounts',
          fields: [
            {
              id: 'f1',
              name: 'currency',
              type: 'char(3)',
              constraints: { isPrimaryKey: false, isNullable: true },
            },
          ],
        },
      },
      references: {},
    };

    const issues = validateSchema(ast);
    const typeIssue = issues.find((issue) => issue.checkId === 'known-type');
    expect(typeIssue).toBeUndefined();
  });
});
