import { describe, expect, it } from 'vitest';
import { normalizeWorkspaceRecord } from './persistence';
import type { DatabaseAST } from '@/types/ast';

const emptyAST: DatabaseAST = {
  version: '1.0',
  tables: {},
  references: {},
};

describe('workspace persistence migration', () => {
  it('migrates a legacy AST record', () => {
    const snapshot = normalizeWorkspaceRecord(emptyAST);

    expect(snapshot).toMatchObject({
      workspaceVersion: 2,
      ast: emptyAST,
      rawText: '',
    });
  });

  it('preserves an invalid DBML draft beside the last valid AST', () => {
    const snapshot = normalizeWorkspaceRecord({
      workspaceVersion: 2,
      ast: emptyAST,
      rawText: 'Table unfinished {',
      savedAt: 123,
    });

    expect(snapshot).toEqual({
      workspaceVersion: 2,
      ast: emptyAST,
      rawText: 'Table unfinished {',
      savedAt: 123,
    });
  });

  it('rejects malformed records', () => {
    expect(normalizeWorkspaceRecord({ rawText: 'Table x {}' })).toBeNull();
  });

  it('turns HTML line breaks in persisted DBML into real newlines', () => {
    const snapshot = normalizeWorkspaceRecord({
      workspaceVersion: 2,
      ast: emptyAST,
      rawText: 'Table users {<br>  id integer [pk]<br>}',
      savedAt: 1,
    });

    expect(snapshot?.rawText).toBe('Table users {\n  id integer [pk]\n}');
  });

  it('decodes escaped br entities in persisted DBML', () => {
    const snapshot = normalizeWorkspaceRecord({
      workspaceVersion: 2,
      ast: emptyAST,
      rawText: 'Table users {&lt;br&gt;  id integer [pk]&amp;lt;br&amp;gt;}',
      savedAt: 1,
    });

    expect(snapshot?.rawText).toBe('Table users {\n  id integer [pk]\n}');
  });
});
