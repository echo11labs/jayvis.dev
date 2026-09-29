import { describe, expect, it } from 'vitest';
import { normalizeStudioFile, normalizeWorkspaceRecord } from './persistence';
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

  it('keeps the catalog and baselines in one studio file', () => {
    const file = normalizeStudioFile({
      fileVersion: 1,
      snapshot: {
        workspaceVersion: 2,
        ast: emptyAST,
        rawText: 'Table users {\n  id integer\n}',
        savedAt: 5,
      },
      catalog: {
        activeId: 'ws-1',
        workspaces: [
          {
            id: 'ws-1',
            name: 'ecommerce-db',
            branch: 'main',
            branches: [{ name: 'main', rawText: 'Table users {\n  id integer\n}', savedAt: 5 }],
          },
        ],
      },
      baselines: { 'ws-1:main': { ast: emptyAST, capturedAt: 5 } },
    });

    expect(file?.catalog.activeId).toBe('ws-1');
    expect(file?.baselines['ws-1:main']?.capturedAt).toBe(5);
    expect(normalizeStudioFile({ fileVersion: 1, snapshot: emptyAST })).toBeNull();
  });
});
