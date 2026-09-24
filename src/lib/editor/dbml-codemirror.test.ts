import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { DatabaseAST } from '@/types/ast';
import { dbmlCompletionSource, dbmlFoldService, dbmlLanguage } from './dbml-codemirror';

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
    },
    references: {},
  };
}

function tokenNames(doc: string): string[] {
  const state = EditorState.create({
    doc,
    extensions: [dbmlLanguage],
  });
  const names: string[] = [];
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name && node.name !== 'Document') names.push(node.name);
    },
  });
  return names;
}

describe('dbml CodeMirror language', () => {
  it('marks keywords, types, and settings', () => {
    const names = tokenNames('Table users { id integer [pk] }');
    expect(names).toContain('keyword');
    expect(names.some((name) => name === 'type' || name === 'typeName')).toBe(true);
    expect(names.some((name) => name === 'attribute' || name === 'attributeName')).toBe(true);
  });

  it('completes columns after a dotted table name', async () => {
    const doc = 'Ref: users.';
    const result = dbmlCompletionSource(() => ast())({
      state: EditorState.create({ doc }),
      pos: doc.length,
      explicit: true,
    } as never);
    expect(result).toBeTruthy();
    if (!result || 'then' in result) throw new Error('expected sync completions');
    expect(result.options.map((item) => item.label)).toEqual(['id', 'email']);
  });

  it('folds a table block', () => {
    const doc = 'Table users {\n  id integer\n}';
    const state = EditorState.create({ doc });
    const range = dbmlFoldService(state, 0);
    expect(range).toEqual({ from: 13, to: doc.lastIndexOf('}') });
  });
});
