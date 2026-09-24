import { describe, expect, it } from 'vitest';
import type { DatabaseAST } from '@/types/ast';
import {
  completeDbml,
  lintDbml,
  offsetToLine,
  tokenizeDbml,
} from './dbml-language';
import { validateSchema } from '@/lib/validation/schema-validation';

const sample = `Table users {
  id integer [pk, increment]
  email varchar [unique, not null]
}

Ref: posts.user_id > users.id
`;

function ast(): DatabaseAST {
  return {
    version: '1.0',
    tables: {
      users: {
        id: 'users',
        name: 'users',
        fields: [
          { id: 'users.id', name: 'id', type: 'integer', constraints: { isPrimaryKey: true } },
          { id: 'users.email', name: 'email', type: 'varchar', constraints: { isUnique: true } },
        ],
      },
      posts: {
        id: 'posts',
        name: 'posts',
        fields: [
          { id: 'posts.id', name: 'id', type: 'integer', constraints: { isPrimaryKey: true } },
          { id: 'posts.user_id', name: 'user_id', type: 'integer', constraints: {} },
        ],
      },
    },
    references: {},
  };
}

describe('dbml language', () => {
  it('tokenizes keywords, types, settings, and comments', () => {
    const kinds = tokenizeDbml('Table users { id integer [pk] // note\n}').map(
      (token) => `${token.kind}:${token.value}`,
    );
    expect(kinds).toContain('keyword:Table');
    expect(kinds).toContain('type:integer');
    expect(kinds).toContain('setting:pk');
    expect(kinds.some((item) => item.startsWith('comment:'))).toBe(true);
  });

  it('completes SQL types after a column name', () => {
    const doc = 'Table users {\n  email ';
    const { options } = completeDbml(doc, doc.length, ast());
    expect(options.map((item) => item.label)).toContain('varchar');
  });

  it('completes table columns after a dotted ref', () => {
    const doc = 'Ref: users.';
    const { options } = completeDbml(doc, doc.length, ast());
    expect(options.map((item) => item.label)).toEqual(['id', 'email']);
  });

  it('completes declared enums as column types and tables inside a group', () => {
    const schema = ast();
    schema.enums = { order_status: { name: 'order_status', values: [{ name: 'open' }] } };
    const typed = 'Table orders {\n  status ';
    expect(completeDbml(typed, typed.length, schema).options.map((item) => item.label)).toContain(
      'order_status',
    );
    const group = 'TableGroup checkout {\n  ';
    expect(completeDbml(group, group.length, schema).options.map((item) => item.label)).toEqual(
      expect.arrayContaining(['users', 'posts']),
    );
    const project = 'Project app {\n  database_type: ';
    expect(completeDbml(project, project.length, schema).options.map((item) => item.label)).toContain(
      'PostgreSQL',
    );
  });

  it('completes column settings inside brackets', () => {
    const doc = 'Table users {\n  id integer [';
    const { options } = completeDbml(doc, doc.length, ast());
    expect(options.map((item) => item.label)).toContain('pk');
    expect(options.map((item) => item.label)).toContain('increment');
  });

  it('reports unmatched braces and maps schema issues to identifiers', () => {
    const doc = 'Table logs {\n  body text\n';
    const issues = validateSchema({
      version: '1.0',
      tables: {
        logs: {
          id: 'logs',
          name: 'logs',
          fields: [
            { id: 'logs.body', name: 'body', type: 'text', constraints: { isNullable: true } },
          ],
        },
      },
      references: {},
    });
    const diagnostics = lintDbml(doc, null, issues);
    expect(diagnostics.some((item) => item.message.includes("closing brace"))).toBe(true);
    expect(diagnostics.some((item) => item.message.includes('primary key'))).toBe(true);
    expect(offsetToLine(doc, doc.indexOf('logs'))).toBe(1);
  });

  it('pins parse errors to an explicit line', () => {
    const diagnostics = lintDbml(sample, 'Expect an identifier', [], 3);
    const parse = diagnostics.find((item) => item.source === 'parse');
    expect(parse?.line).toBe(3);
    expect(parse?.message).toContain('identifier');
  });
});
