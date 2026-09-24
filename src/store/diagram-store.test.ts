import { beforeEach, describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import { useDiagramStore } from './diagram-store';
import type { DatabaseAST, SchemaTable } from '@/types/ast';

const emptyAST: DatabaseAST = {
  version: '1.0',
  tables: {},
  references: {},
};

function tableAST(name: string): {
  ast: DatabaseAST;
  nodes: Node[];
  edges: Edge[];
} {
  const table: SchemaTable = {
    id: name,
    name,
    fields: [
      {
        id: `${name}.id`,
        name: 'id',
        type: 'integer',
        constraints: { isPrimaryKey: true, isNullable: false },
      },
    ],
    position: { x: 0, y: 0 },
  };
  return {
    ast: {
      version: '1.0',
      tables: { [name]: table },
      references: {},
    },
    nodes: [
      {
        id: name,
        type: 'table',
        position: { x: 0, y: 0 },
        data: { table },
      },
    ],
    edges: [],
  };
}

describe('diagram synchronization contract', () => {
  beforeEach(() => {
    useDiagramStore.getState().loadAST(emptyAST);
  });

  it('uses incoming positions when a loaded project replaces the previous graph', () => {
    const store = useDiagramStore.getState();
    const current = tableAST('users');
    current.ast.tables.users.position = { x: 40, y: 80 };
    store.loadAST(current.ast);
    expect(useDiagramStore.getState().nodes[0]?.position).toEqual({ x: 40, y: 80 });

    const incoming = tableAST('users');
    const kept = store.beginParse();
    store.setParsedAST(
      incoming.ast,
      [{ ...incoming.nodes[0], position: { x: 300, y: 120 } }],
      [],
      kept,
    );
    expect(useDiagramStore.getState().nodes[0]?.position).toEqual({ x: 40, y: 80 });

    const loaded = store.beginParse();
    store.setParsedAST(
      incoming.ast,
      [{ ...incoming.nodes[0], position: { x: 300, y: 120 } }],
      [],
      loaded,
      { replacePositions: true },
    );
    expect(useDiagramStore.getState().nodes[0]?.position).toEqual({ x: 300, y: 120 });
    expect(useDiagramStore.getState().layoutOnNextParse).toBe(false);
  });

  it('ignores stale parse results and accepts the latest generation', () => {
    const first = tableAST('first');
    const latest = tableAST('latest');
    const store = useDiagramStore.getState();

    store.setRawText('Table first { id integer [pk] }');
    const firstGeneration = store.beginParse();
    store.setRawText('Table latest { id integer [pk] }');
    const latestGeneration = store.beginParse();

    store.setParsedAST(
      first.ast,
      first.nodes,
      first.edges,
      firstGeneration,
    );
    expect(useDiagramStore.getState().ast.tables.first).toBeUndefined();

    store.setParsedAST(
      latest.ast,
      latest.nodes,
      latest.edges,
      latestGeneration,
    );
    const state = useDiagramStore.getState();
    expect(state.ast.tables.latest).toBeDefined();
    expect(state.syncStatus).toBe('synced');
    expect(state.sourceOrigin).toBe('editor');
  });

  it('blocks semantic canvas mutations while the draft is invalid', () => {
    const store = useDiagramStore.getState();
    store.setRawText('Table broken {');
    const generation = store.beginParse();
    store.setParseFailure(
      generation,
      "Expect a closing brace '}'",
      'invalid',
    );

    store.addTable(tableAST('unsafe').ast.tables.unsafe);

    const state = useDiagramStore.getState();
    expect(state.ast.tables).toEqual({});
    expect(state.rawText).toBe('Table broken {');
    expect(state.statusMessage).toContain('Cannot add a table');
  });

  it('hydrates a persisted draft without replacing its last valid AST', () => {
    const valid = tableAST('users');
    useDiagramStore
      .getState()
      .hydrateWorkspace(valid.ast, 'Table users {');

    const state = useDiagramStore.getState();
    expect(state.rawText).toBe('Table users {');
    expect(state.ast.tables.users).toBeDefined();
    expect(state.syncStatus).toBe('parsing');
    expect(state.sourceOrigin).toBe('editor');
  });

  it('replaces a workspace atomically and restores it with undo', () => {
    const users = tableAST('users');
    const store = useDiagramStore.getState();
    store.replaceWorkspace({
      ast: users.ast,
      origin: 'canvas',
      recordHistory: false,
    });
    store.setSelectedTable('users');

    store.replaceWorkspace({
      ast: emptyAST,
      rawText: '',
      origin: 'canvas',
      statusMessage: 'Schema cleared',
    });

    let state = useDiagramStore.getState();
    expect(state.ast.tables).toEqual({});
    expect(state.rawText).toBe('');
    expect(state.selectedTable).toBeNull();
    expect(state.undoStack).toHaveLength(1);

    store.undo();
    state = useDiagramStore.getState();
    expect(state.ast.tables.users).toBeDefined();
    expect(state.selectedTable).toBe('users');
    expect(state.syncStatus).toBe('synced');
  });

  it('keeps selection valid after rename and undo', () => {
    const users = tableAST('users');
    const store = useDiagramStore.getState();
    store.replaceWorkspace({
      ast: users.ast,
      origin: 'canvas',
      recordHistory: false,
    });
    store.setSelectedTable('users');
    store.renameTable('users', 'accounts');

    let state = useDiagramStore.getState();
    expect(state.selectedTable).toBe('accounts');
    expect(state.ast.tables.users).toBeUndefined();
    expect(state.nodes.some((node) => node.id === 'accounts' && node.selected)).toBe(
      true,
    );

    store.undo();
    state = useDiagramStore.getState();
    expect(state.selectedTable).toBe('users');
    expect(state.ast.tables.accounts).toBeUndefined();
  });

  it('records color and completed drag gestures without pointer chatter', () => {
    const users = tableAST('users');
    const store = useDiagramStore.getState();
    store.replaceWorkspace({
      ast: users.ast,
      origin: 'canvas',
      recordHistory: false,
    });

    store.setTableColor('users', '#10B981');
    expect(useDiagramStore.getState().undoStack).toHaveLength(1);

    store.beginVisualGesture();
    store.updateNodePosition('users', { x: 40, y: 80 });
    store.updateNodePosition('users', { x: 80, y: 120 });
    store.endVisualGesture();

    const state = useDiagramStore.getState();
    expect(state.undoStack).toHaveLength(2);
    expect(state.nodes[0]?.position).toEqual({ x: 80, y: 120 });

    store.undo();
    expect(useDiagramStore.getState().nodes[0]?.position).toEqual({ x: 0, y: 0 });
  });

  it('rejects duplicate table and column names', () => {
    const users = tableAST('users');
    const store = useDiagramStore.getState();
    store.replaceWorkspace({
      ast: users.ast,
      origin: 'canvas',
      recordHistory: false,
    });

    store.addTable(users.ast.tables.users);
    expect(useDiagramStore.getState().statusMessage).toContain('already exists');

    store.addFieldToTable('users', {
      id: 'users.id',
      name: 'id',
      type: 'integer',
      constraints: {},
    });
    expect(useDiagramStore.getState().ast.tables.users.fields).toHaveLength(1);

    store.updateField('users', 'id', {
      id: 'users.id',
      name: 'id',
      type: 'uuid',
      constraints: { isPrimaryKey: true, isNullable: false },
    });
    expect(useDiagramStore.getState().ast.tables.users.fields[0]?.type).toBe('uuid');

    store.renameTable('users', 'users');
    expect(useDiagramStore.getState().ast.tables.users).toBeDefined();
  });
});
