import { create } from 'zustand';
import {
  Node,
  Edge,
  NodeChange,
  applyNodeChanges,
  Connection,
  addEdge,
} from '@xyflow/react';
import {
  DatabaseAST,
  SchemaTable,
  SchemaField,
  SchemaReference,
  Origin,
  TABLE_COLORS,
} from '@/types/ast';
import { serializeDBML } from '@/lib/parser/dbml';

/**
 * Build a React Flow edge label showing the source field → target field
 * plus cardinality, so relationships are self-documenting on the canvas.
 */
function edgeLabel(ref: SchemaReference): string {
  return `${ref.sourceField} → ${ref.targetField}  ·  ${ref.cardinality}`;
}

/** Build a full Edge object from a SchemaReference. */
function refToEdge(ref: SchemaReference): Edge {
  return {
    id: ref.id,
    source: ref.sourceTable,
    target: ref.targetTable,
    sourceHandle: `${ref.sourceTable}.${ref.sourceField}-source`,
    targetHandle: `${ref.targetTable}.${ref.targetField}-target`,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#6366F1', strokeWidth: 2 },
    label: edgeLabel(ref),
    labelStyle: { fontSize: 10, fill: '#a1a1aa' },
    labelBgStyle: { fill: '#18181b' },
  };
}

interface DiagramStoreState {
  ast: DatabaseAST;
  nodes: Node[];
  edges: Edge[];
  rawText: string;
  sourceOrigin: Origin;
  previousAST: DatabaseAST | null;
  statusMessage: string;
  isParsing: boolean;
  parseError: string | null;
  selectedTable: string | null;
  hydrated: boolean;
  /** Undo/redo history stacks (store snapshots of {ast, nodes, edges}). */
  undoStack: Array<{ ast: DatabaseAST; nodes: Node[]; edges: Edge[] }>;
  redoStack: Array<{ ast: DatabaseAST; nodes: Node[]; edges: Edge[] }>;

  setRawText: (text: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setParsedAST: (ast: DatabaseAST, nodes: Node[], edges: Edge[]) => void;
  setParseStatus: (isParsing: boolean, parseError: string | null) => void;
  setSelectedTable: (name: string | null) => void;
  setHydrated: (v: boolean) => void;
  captureSnapshot: () => void;
  setStatusMessage: (msg: string) => void;
  applyNodePositionsToAST: () => void;
  resetTo: (ast: DatabaseAST, nodes: Node[], edges: Edge[]) => void;
  loadAST: (ast: DatabaseAST) => void;
  addTable: (table: SchemaTable) => void;
  deleteTable: (tableName: string) => void;
  addFieldToTable: (tableName: string, field: SchemaField) => void;
  updateField: (tableName: string, oldFieldName: string, field: SchemaField) => void;
  deleteField: (tableName: string, fieldName: string) => void;
  addReference: (ref: SchemaReference) => void;
  updateReference: (refId: string, patch: Partial<SchemaReference>) => void;
  deleteReference: (refId: string) => void;
  setTableColor: (tableName: string, color: string) => void;
  renameTable: (oldName: string, newName: string) => void;
  setTableNote: (tableName: string, note: string) => void;
  setFieldNote: (tableName: string, fieldName: string, note: string) => void;
  moveField: (tableName: string, fromIndex: number, toIndex: number) => void;
  /** Push the current state onto the undo stack before a mutation. */
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export const useDiagramStore = create<DiagramStoreState>((set, get) => ({
  ast: { version: '1.0', tables: {}, references: {} },
  nodes: [],
  edges: [],
  rawText: '',
  sourceOrigin: 'none',
  previousAST: null,
  statusMessage: 'Ready',
  isParsing: false,
  parseError: null,
  selectedTable: null,
  hydrated: false,
  undoStack: [],
  redoStack: [],

  setRawText: (rawText: string) => {
    set({ rawText, sourceOrigin: 'editor' });
  },

  onNodesChange: (changes: NodeChange[]) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
      sourceOrigin: 'canvas',
    }));
  },

  onEdgesChange: (changes: any) => {
    set((state) => ({
      edges: applyNodeChanges(changes as any, state.edges) as Edge[],
      sourceOrigin: 'canvas',
    }));
  },

  onConnect: (connection: Connection) => {
    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) return;
    const sourceField = connection.sourceHandle.replace(/-source$/, '').replace(`${connection.source}.`, '');
    const targetField = connection.targetHandle.replace(/-target$/, '').replace(`${connection.target}.`, '');
    const refId = `ref_${connection.source}.${sourceField}__${connection.target}.${targetField}`;
    get().addReference({
      id: refId,
      sourceTable: connection.source,
      sourceField,
      targetTable: connection.target,
      targetField,
      cardinality: '1:N',
    });
  },

  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, position } : node,
      ),
      sourceOrigin: 'canvas',
    }));
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  setParsedAST: (ast: DatabaseAST, nodes: Node[], edges: Edge[]) => {
    set((state) => {
      const reconciledNodes = nodes.map((n) => {
        const existing = state.nodes.find((curr) => curr.id === n.id);
        return existing?.position ? { ...n, position: existing.position } : n;
      });
      return {
        ast,
        nodes: reconciledNodes,
        edges,
        sourceOrigin: 'none',
      };
    });
  },

  setParseStatus: (isParsing, parseError) => set({ isParsing, parseError }),
  setSelectedTable: (name) => set({ selectedTable: name }),
  setHydrated: (v) => set({ hydrated: v }),

  addTable: (table: SchemaTable) => {
    const { ast } = get();
    if (ast.tables[table.name]) {
      set({ statusMessage: `Table "${table.name}" already exists` });
      return;
    }
    get().pushHistory();
    const color = table.color || TABLE_COLORS[Object.keys(ast.tables).length % TABLE_COLORS.length];
    const newTable = { ...table, color };
    const newAST = { ...ast, tables: { ...ast.tables, [table.name]: newTable } };
    const newNode: Node = {
      id: table.name,
      type: 'table',
      position: table.position ?? { x: 0, y: 0 },
      data: { table: newTable },
    };
    set({
      ast: newAST,
      nodes: [...get().nodes, newNode],
      rawText: serializeDBML(newAST),
      selectedTable: newTable.name,
      sourceOrigin: 'canvas',
      statusMessage: `Created table "${table.name}"`,
    });
  },

  deleteTable: (tableName: string) => {
    get().pushHistory();
    const { ast, nodes, edges } = get();
    const newTables = { ...ast.tables };
    delete newTables[tableName];
    const newRefs: Record<string, SchemaReference> = {};
    for (const [id, r] of Object.entries(ast.references)) {
      if (r.sourceTable !== tableName && r.targetTable !== tableName) {
        newRefs[id] = r;
      }
    }
    const newAST = { ...ast, tables: newTables, references: newRefs };
    set({
      ast: newAST,
      nodes: nodes.filter((n) => n.id !== tableName),
      edges: edges.filter((e) => e.source !== tableName && e.target !== tableName),
      rawText: serializeDBML(newAST),
      selectedTable: null,
      sourceOrigin: 'canvas',
      statusMessage: `Dropped table "${tableName}"`,
    });
  },

  addFieldToTable: (tableName: string, field: SchemaField) => {
    const { ast } = get();
    if (!ast.tables[tableName]) return;
    get().pushHistory();
    const table = ast.tables[tableName];
    const updatedTable = { ...table, fields: [...table.fields, field] };
    const newAST = { ...ast, tables: { ...ast.tables, [tableName]: updatedTable } };
    set((state) => ({
      ast: newAST,
      nodes: state.nodes.map((n) =>
        n.id === tableName ? { ...n, data: { table: updatedTable } } : n,
      ),
      rawText: serializeDBML(newAST),
      sourceOrigin: 'mcp',
      statusMessage: `Added column "${field.name}" to ${tableName}`,
    }));
  },

  deleteField: (tableName: string, fieldName: string) => {
    const { ast } = get();
    if (!ast.tables[tableName]) return;
    get().pushHistory();
    const table = ast.tables[tableName];
    const updatedTable = { ...table, fields: table.fields.filter((f) => f.name !== fieldName) };
    const newAST = { ...ast, tables: { ...ast.tables, [tableName]: updatedTable } };
    set((state) => ({
      ast: newAST,
      nodes: state.nodes.map((n) =>
        n.id === tableName ? { ...n, data: { table: updatedTable } } : n,
      ),
      rawText: serializeDBML(newAST),
      sourceOrigin: 'canvas',
      statusMessage: `Dropped column "${fieldName}" from ${tableName}`,
    }));
  },

  addReference: (ref: SchemaReference) => {
    const { ast } = get();
    if (ast.references[ref.id]) return;
    get().pushHistory();
    const newRefs = { ...ast.references, [ref.id]: ref };
    const newEdge: Edge = refToEdge(ref);
    const newAST = { ...ast, references: newRefs };
    set({
      ast: newAST,
      edges: [...get().edges, newEdge],
      rawText: serializeDBML(newAST),
      sourceOrigin: 'canvas',
      statusMessage: `Created relationship ${ref.sourceTable}.${ref.sourceField} → ${ref.targetTable}.${ref.targetField}`,
    });
  },

  updateField: (tableName: string, oldFieldName: string, field: SchemaField) => {
    const { ast } = get();
    if (!ast.tables[tableName]) return;
    get().pushHistory();
    const table = ast.tables[tableName];
    const updatedTable: SchemaTable = {
      ...table,
      fields: table.fields.map((f) => (f.name === oldFieldName ? field : f)),
    };
    const newAST = { ...ast, tables: { ...ast.tables, [tableName]: updatedTable } };

    // Update references that referenced the old field name.
    const newRefs: Record<string, SchemaReference> = {};
    for (const [id, r] of Object.entries(newAST.references)) {
      const nr = { ...r };
      if (r.sourceTable === tableName && r.sourceField === oldFieldName) {
        nr.sourceField = field.name;
      }
      if (r.targetTable === tableName && r.targetField === oldFieldName) {
        nr.targetField = field.name;
      }
      const newId = `ref_${nr.sourceTable}.${nr.sourceField}__${nr.targetTable}.${nr.targetField}`;
      newRefs[newId] = nr;
    }
    const finalAST = { ...newAST, references: newRefs };

    set((state) => ({
      ast: finalAST,
      nodes: state.nodes.map((n) =>
        n.id === tableName ? { ...n, data: { table: updatedTable } } : n,
      ),
      edges: Object.values(newRefs).map((r) => refToEdge(r)),
      rawText: serializeDBML(finalAST),
      sourceOrigin: 'canvas',
      statusMessage: `Updated column "${field.name}" in ${tableName}`,
    }));
  },

  deleteReference: (refId: string) => {
    const { ast } = get();
    if (!ast.references[refId]) return;
    get().pushHistory();
    const newRefs = { ...ast.references };
    delete newRefs[refId];
    const newAST = { ...ast, references: newRefs };
    set({
      ast: newAST,
      edges: get().edges.filter((e) => e.id !== refId),
      rawText: serializeDBML(newAST),
      sourceOrigin: 'canvas',
      statusMessage: `Dropped relationship`,
    });
  },

  updateReference: (refId: string, patch: Partial<SchemaReference>) => {
    const { ast } = get();
    const ref = ast.references[refId];
    if (!ref) return;
    get().pushHistory();
    const updated: SchemaReference = { ...ref, ...patch };
    const newRefs = { ...ast.references, [refId]: updated };
    const newAST = { ...ast, references: newRefs };
    const newEdge: Edge = refToEdge(updated);
    set({
      ast: newAST,
      edges: get().edges.map((e) => (e.id === refId ? newEdge : e)),
      rawText: serializeDBML(newAST),
      sourceOrigin: 'canvas',
      statusMessage: `Updated relationship`,
    });
  },

  setTableColor: (tableName: string, color: string) => {
    const { ast } = get();
    if (!ast.tables[tableName]) return;
    const updatedTables = {
      ...ast.tables,
      [tableName]: { ...ast.tables[tableName], color },
    };
    const newAST = { ...ast, tables: updatedTables };
    set((state) => ({
      ast: newAST,
      nodes: state.nodes.map((n) =>
        n.id === tableName
          ? { ...n, data: { table: updatedTables[tableName] } }
          : n,
      ),
      sourceOrigin: 'canvas',
    }));
  },

  setTableNote: (tableName: string, note: string) => {
    const { ast } = get();
    if (!ast.tables[tableName]) return;
    get().pushHistory();
    const updatedTables = {
      ...ast.tables,
      [tableName]: { ...ast.tables[tableName], note },
    };
    const newAST = { ...ast, tables: updatedTables };
    set((state) => ({
      ast: newAST,
      nodes: state.nodes.map((n) =>
        n.id === tableName
          ? { ...n, data: { table: updatedTables[tableName] } }
          : n,
      ),
      sourceOrigin: 'canvas',
    }));
  },

  setFieldNote: (tableName: string, fieldName: string, note: string) => {
    const { ast } = get();
    if (!ast.tables[tableName]) return;
    get().pushHistory();
    const table = ast.tables[tableName];
    const updatedTable = {
      ...table,
      fields: table.fields.map((f) =>
        f.name === fieldName ? { ...f, note } : f,
      ),
    };
    const newAST = { ...ast, tables: { ...ast.tables, [tableName]: updatedTable } };
    set((state) => ({
      ast: newAST,
      nodes: state.nodes.map((n) =>
        n.id === tableName ? { ...n, data: { table: updatedTable } } : n,
      ),
      sourceOrigin: 'canvas',
    }));
  },

  moveField: (tableName: string, fromIndex: number, toIndex: number) => {
    const { ast } = get();
    if (!ast.tables[tableName]) return;
    const table = ast.tables[tableName];
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= table.fields.length ||
      toIndex >= table.fields.length ||
      fromIndex === toIndex
    )
      return;
    get().pushHistory();
    const newFields = [...table.fields];
    const [moved] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex, 0, moved);
    const updatedTable = { ...table, fields: newFields };
    const newAST = { ...ast, tables: { ...ast.tables, [tableName]: updatedTable } };
    set((state) => ({
      ast: newAST,
      rawText: serializeDBML(newAST),
      nodes: state.nodes.map((n) =>
        n.id === tableName ? { ...n, data: { table: updatedTable } } : n,
      ),
      sourceOrigin: 'canvas',
      statusMessage: `Moved column in ${tableName}`,
    }));
  },

  renameTable: (oldName: string, newName: string) => {
    const { ast } = get();
    const table = ast.tables[oldName];
    if (!table || ast.tables[newName] || !newName) return;
    get().pushHistory();

    const newTables: Record<string, SchemaTable> = {};
    for (const [name, t] of Object.entries(ast.tables)) {
      if (name === oldName) {
        newTables[newName] = { ...t, name: newName, id: newName };
      } else {
        newTables[name] = t;
      }
    }

    const newRefs: Record<string, SchemaReference> = {};
    for (const [, r] of Object.entries(ast.references)) {
      const nr = { ...r };
      if (nr.sourceTable === oldName) nr.sourceTable = newName;
      if (nr.targetTable === oldName) nr.targetTable = newName;
      const newId = `ref_${nr.sourceTable}.${nr.sourceField}__${nr.targetTable}.${nr.targetField}`;
      newRefs[newId] = nr;
    }

    const newAST: DatabaseAST = { ...ast, tables: newTables, references: newRefs };
    set((state) => ({
      ast: newAST,
      nodes: state.nodes.map((n) =>
        n.id === oldName
          ? {
              ...n,
              id: newName,
              data: { table: newTables[newName] },
            }
          : n,
      ),
      edges: Object.values(newRefs).map((r) => refToEdge(r)),
      rawText: serializeDBML(newAST),
      selectedTable: newName,
      sourceOrigin: 'canvas',
      statusMessage: `Renamed table "${oldName}" → "${newName}"`,
    }));
  },

  captureSnapshot: () => {
    const { ast } = get();
    set({ previousAST: JSON.parse(JSON.stringify(ast)) });
  },

  setStatusMessage: (msg: string) => set({ statusMessage: msg }),

  applyNodePositionsToAST: () => {
    const { ast, nodes } = get();
    const updatedTables: Record<string, SchemaTable> = {};
    for (const [name, table] of Object.entries(ast.tables)) {
      const node = nodes.find((n) => n.id === name);
      updatedTables[name] = {
        ...table,
        position: node ? { x: node.position.x, y: node.position.y } : table.position,
      };
    }
    set({ ast: { ...ast, tables: updatedTables } });
  },

  resetTo: (ast: DatabaseAST, nodes: Node[], edges: Edge[]) => {
    set({ ast, nodes, edges, sourceOrigin: 'none' });
  },

  pushHistory: () => {
    const { ast, nodes, edges, undoStack } = get();
    const snapshot = {
      ast: JSON.parse(JSON.stringify(ast)) as DatabaseAST,
      nodes: JSON.parse(JSON.stringify(nodes)) as Node[],
      edges: JSON.parse(JSON.stringify(edges)) as Edge[],
    };
    // Cap history at 50 entries to avoid memory growth.
    const next = [...undoStack, snapshot].slice(-50);
    set({ undoStack: next, redoStack: [] });
  },

  undo: () => {
    const { undoStack, redoStack, ast, nodes, edges } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    const current = {
      ast: JSON.parse(JSON.stringify(ast)) as DatabaseAST,
      nodes: JSON.parse(JSON.stringify(nodes)) as Node[],
      edges: JSON.parse(JSON.stringify(edges)) as Edge[],
    };
    set({
      ast: prev.ast,
      nodes: prev.nodes,
      edges: prev.edges,
      rawText: serializeDBML(prev.ast),
      sourceOrigin: 'canvas',
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, current],
      statusMessage: 'Undid last action',
    });
  },

  redo: () => {
    const { undoStack, redoStack, ast, nodes, edges } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const current = {
      ast: JSON.parse(JSON.stringify(ast)) as DatabaseAST,
      nodes: JSON.parse(JSON.stringify(nodes)) as Node[],
      edges: JSON.parse(JSON.stringify(edges)) as Edge[],
    };
    set({
      ast: next.ast,
      nodes: next.nodes,
      edges: next.edges,
      rawText: serializeDBML(next.ast),
      sourceOrigin: 'canvas',
      undoStack: [...undoStack, current],
      redoStack: redoStack.slice(0, -1),
      statusMessage: 'Redid action',
    });
  },

  loadAST: (ast: DatabaseAST) => {
    const nodes: Node[] = Object.values(ast.tables).map((t) => ({
      id: t.name,
      type: 'table',
      position: t.position ?? { x: 0, y: 0 },
      data: { table: t },
    }));
    const edges: Edge[] = Object.values(ast.references).map((r) => refToEdge(r));
    set({ ast, nodes, edges, sourceOrigin: 'none', previousAST: null, parseError: null });
  },
}));
