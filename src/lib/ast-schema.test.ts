import { describe, expect, it } from 'vitest';
import { parseImportedAST, parseImportedFile } from './ast-schema';

const validAST = {
  version: '1.0',
  tables: {
    users: {
      id: 'users',
      name: 'users',
      fields: [
        {
          id: 'users.id',
          name: 'id',
          type: 'integer',
          constraints: { isPrimaryKey: true, isNullable: false },
        },
      ],
      position: { x: 10, y: 20 },
    },
  },
  references: {},
};

describe('imported AST validation', () => {
  it('accepts a complete DatabaseAST', () => {
    const result = parseImportedAST(validAST);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ast.tables.users.name).toBe('users');
    }
  });

  it('rejects JSON that is missing table fields', () => {
    const result = parseImportedAST({
      version: '1.0',
      tables: { users: { name: 'users' } },
      references: {},
    });
    expect(result.ok).toBe(false);
  });

  it('imports .json only when the AST is valid', () => {
    const ok = parseImportedFile('schema.json', JSON.stringify(validAST));
    expect(ok.kind).toBe('ast');

    const bad = parseImportedFile('schema.json', '{"tables":{}}');
    expect(bad.kind).toBe('error');
  });

  it('treats DBML files as drafts', () => {
    const result = parseImportedFile(
      'schema.dbml',
      'Table users { id integer [pk] }',
    );
    expect(result).toEqual({
      kind: 'dbml',
      rawText: 'Table users { id integer [pk] }',
    });
  });
});
