import { create } from 'zustand';
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  addEdge,
} from '@xyflow/react';
import {
  DatabaseAST,
  SchemaTable,
  SchemaField,
  SchemaReference,
  Origin,
  SyncStatus,
  TABLE_COLORS,
} from '@/types/ast';
import { positionsCollapsed } from '@/lib/layout/elk-layout';
import { sanitizeDbmlText, serializeDBML } from '@/lib/parser/dbml';
import { hasDuplicateIdents, normalizeIdent } from '@/lib/ident';

/**
 * Build a React Flow edge label showing the source field → target field
 * plus cardinality, so relationships are self-documenting on the canvas.
 */
function edgeLabel(ref: SchemaReference): string {
  if (ref.cardinality === '1:1') return '1:1';
  if (ref.cardinality === 'N:M') return '*:*';
  return '1:*';
}

/** Stroke color per cardinality for visual distinction. */
function cardinalityStroke(cardinality: string): string {
  switch (cardinality) {
    case '1:1':
      return 'var(--color-accent-success)';
    case '1:N':
      return 'var(--color-accent-primary)';
    case 'N:M':
      return 'var(--color-accent-warning)';
    default:
      return 'var(--color-accent-primary)';
  }
}

function syncNodePositions(ast: DatabaseAST, nodes: Node[]): DatabaseAST {
  let changed = false;
  const tables = { ...ast.tables };

  for (const node of nodes) {
    const table = tables[node.id];
    if (!table) continue;
    if (
      table.position?.x === node.position.x &&
      table.position?.y === node.position.y
    ) {
      continue;
    }
    tables[node.id] = {
      ...table,
      position: { x: node.position.x, y: node.position.y },
    };
    changed = true;
  }

  return changed ? { ...ast, tables } : ast;
}

/** Build a full Edge object from a SchemaReference. */
function refToEdge(ref: SchemaReference): Edge {
  const stroke = cardinalityStroke(ref.cardinality);
  return {
    id: ref.id,
    source: ref.sourceTable,
    target: ref.targetTable,
    sourceHandle: `${ref.sourceTable}.${ref.sourceField}-source`,
    targetHandle: `${ref.targetTable}.${ref.targetField}-target`,
    type: 'smoothstep',
    animated: true,
    style: { stroke, strokeWidth: 2 },
    label: edgeLabel(ref),
    labelStyle: { fontSize: 10, fill: '#737373', fontWeight: 500 },
    labelBgStyle: { fill: '#141414', fillOpacity: 0.85 },
    markerEnd: {
      type: 'arrowclosed' as const,
      width: 16,
      height: 16,
      color: stroke,
    },
  };
}

export interface HistorySnapshot {
  ast: DatabaseAST;
  nodes: Node[];
  edges: Edge[];
  rawText: string;
  selectedTable: string | null;
  selectedEdge: string | null;
  sourceOrigin: Origin;
}

export interface ReplaceWorkspaceInput {
  ast?: DatabaseAST;
  rawText?: string;
  nodes?: Node[];
  edges?: Edge[];
  origin: Origin;
  recordHistory?: boolean;
  resetHistory?: boolean;
  statusMessage?: string;
}

export const EMPTY_AST: DatabaseAST = {
  version: '1.0',
  tables: {},
  references: {},
  enums: {},
  tableGroups: {},
};

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function tablesToNodes(ast: DatabaseAST, selectedTable: string | null): Node[] {
  return Object.values(ast.tables).map((table) => ({
    id: table.name,
    type: 'table',
    position: table.position ?? { x: 0, y: 0 },
    data: { table },
    selected: table.name === selectedTable,
  }));
}

function refsToEdges(ast: DatabaseAST, selectedEdge: string | null): Edge[] {
  return Object.values(ast.references).map((reference) => ({
    ...refToEdge(reference),
    selected: reference.id === selectedEdge,
  }));
}

function reconcileSelection(
  ast: DatabaseAST,
  selectedTable: string | null,
  selectedEdge: string | null,
): { selectedTable: string | null; selectedEdge: string | null } {
  return {
    selectedTable:
      selectedTable && ast.tables[selectedTable] ? selectedTable : null,
    selectedEdge:
      selectedEdge && ast.references[selectedEdge] ? selectedEdge : null,
  };
}

function captureHistory(state: {
  ast: DatabaseAST;
  nodes: Node[];
  edges: Edge[];
  rawText: string;
  selectedTable: string | null;
  selectedEdge: string | null;
  sourceOrigin: Origin;
}): HistorySnapshot {
  return {
    ast: cloneValue(state.ast),
    nodes: cloneValue(state.nodes),
    edges: cloneValue(state.edges),
    rawText: state.rawText,
    selectedTable: state.selectedTable,
    selectedEdge: state.selectedEdge,
    sourceOrigin: state.sourceOrigin,
  };
}

export function workspaceHasContent(state: {
  ast: DatabaseAST;
  rawText: string;
}): boolean {
  return (
    state.rawText.trim().length > 0 || Object.keys(state.ast.tables).length > 0
  );
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
  syncStatus: SyncStatus;
  parseGeneration: number;
  selectedTable: string | null;
  selectedEdge: string | null;
  hydrated: boolean;
  /** Undo/redo history stacks (store snapshots of workspace + selection). */
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
  visualGesture: HistorySnapshot | null;
  /** Next successful parse should place tables instead of reusing the previous graph. */
  layoutOnNextParse: boolean;

  setRawText: (text: string) => void;
  armAutoLayout: () => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  beginParse: () => number;
  setParsedAST: (
    ast: DatabaseAST,
    nodes: Node[],
    edges: Edge[],
    generation: number,
    options?: { replacePositions?: boolean },
  ) => void;
  setParseFailure: (
    generation: number,
    parseError: string,
    syncStatus: 'invalid' | 'offline',
  ) => void;
  setSelectedTable: (name: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  setHydrated: (v: boolean) => void;
  captureSnapshot: () => void;
  setPreviousAST: (ast: DatabaseAST | null) => void;
  setStatusMessage: (msg: string) => void;
  applyNodePositionsToAST: () => void;
  replaceWorkspace: (input: ReplaceWorkspaceInput) => void;
  resetTo: (ast: DatabaseAST, nodes: Node[], edges: Edge[]) => void;
  loadAST: (ast: DatabaseAST) => void;
  hydrateWorkspace: (ast: DatabaseAST, rawText: string) => void;
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
  beginVisualGesture: () => void;
  endVisualGesture: () => void;
  undo: () => void;
  redo: () => void;
}

export const useDiagramStore = create<DiagramStoreState>((set, get) => {
  const requireSynced = (action: string) => {
    const { syncStatus } = get();
    if (syncStatus === 'synced') return true;
    set({
      statusMessage: `Cannot ${action} while DBML is ${syncStatus}`,
    });
    return false;
  };

  return {
  ast: { version: '1.0', tables: {}, references: {}, enums: {}, tableGroups: {} },
  nodes: [],
  edges: [],
  rawText: '',
  sourceOrigin: 'none',
  previousAST: null,
  statusMessage: 'Ready',
  isParsing: false,
  parseError: null,
  syncStatus: 'booting',
  parseGeneration: 0,
  selectedTable: null,
  selectedEdge: null,
  hydrated: false,
  undoStack: [],
  redoStack: [],
  visualGesture: null,
  layoutOnNextParse: false,

  setRawText: (rawText: string) => {
    set({
      rawText: sanitizeDbmlText(rawText),
      sourceOrigin: 'editor',
      syncStatus: 'parsing',
      isParsing: true,
      parseError: null,
    });
  },

  onNodesChange: (changes: NodeChange[]) => {
    const removals = changes.filter((c) => c.type === 'remove');
    if (removals.length > 0) {
      for (const change of removals) {
        if (change.type === 'remove') get().deleteTable(change.id);
      }
      const rest = changes.filter((c) => c.type !== 'remove');
      if (rest.length === 0) return;
      set((state) => {
        const nodes = applyNodeChanges(rest, state.nodes);
        return { nodes, ast: syncNodePositions(state.ast, nodes) };
      });
      return;
    }
    set((state) => {
      const nodes = applyNodeChanges(changes, state.nodes);
      return { nodes, ast: syncNodePositions(state.ast, nodes) };
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    const removals = changes.filter((c) => c.type === 'remove');
    if (removals.length > 0) {
      for (const change of removals) {
        if (change.type === 'remove') get().deleteReference(change.id);
      }
      const rest = changes.filter((c) => c.type !== 'remove');
      if (rest.length === 0) return;
      set((state) => ({
        edges: applyEdgeChanges(rest, state.edges),
      }));
      return;
    }
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
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
    set((state) => {
      const nodes = state.nodes.map((node) =>
        node.id === nodeId ? { ...node, position } : node,
      );
      return { nodes, ast: syncNodePositions(state.ast, nodes) };
    });
  },

  setNodes: (nodes) =>
    set((state) => ({
      nodes,
      ast: syncNodePositions(state.ast, nodes),
    })),
  setEdges: (edges) => set({ edges }),

  armAutoLayout: () => set({ layoutOnNextParse: true }),

  beginParse: () => {
    const generation = get().parseGeneration + 1;
    set({
      parseGeneration: generation,
      syncStatus: 'parsing',
      isParsing: true,
      parseError: null,
    });
    return generation;
  },

  setParsedAST: (
    ast: DatabaseAST,
    nodes: Node[],
    edges: Edge[],
    generation: number,
    options?: { replacePositions?: boolean },
  ) => {
    set((state) => {
      if (generation !== state.parseGeneration) return state;
      const replacePositions = options?.replacePositions === true;
      const existingNodes = new Map(state.nodes.map((node) => [node.id, node]));
      const incomingNodes = new Map(nodes.map((node) => [node.id, node]));
      const reconciledTables: Record<string, SchemaTable> = Object.fromEntries(
        Object.entries(ast.tables).map(([name, table]) => {
          const existingTable = state.ast.tables[name];
          const existingNode = existingNodes.get(name);
          const incoming = incomingNodes.get(name);
          return [
            name,
            {
              ...table,
              color: existingTable?.color ?? table.color,
              position: replacePositions
                ? (incoming?.position ?? table.position)
                : (existingNode?.position ?? table.position),
            },
          ];
        }),
      );
      const reconciledAST = { ...ast, tables: reconciledTables };
      const selectedTable =
        state.selectedTable && reconciledAST.tables[state.selectedTable]
          ? state.selectedTable
          : null;
      const selectedEdge =
        state.selectedEdge && ast.references[state.selectedEdge]
          ? state.selectedEdge
          : null;
      const reconciledNodes = nodes.map((n) => {
        const table = reconciledTables[n.id];
        return table
          ? {
              ...n,
              position: table.position ?? n.position,
              data: { ...n.data, table },
              selected: n.id === selectedTable,
            }
          : { ...n, selected: n.id === selectedTable };
      });
      return {
        ast: reconciledAST,
        nodes: reconciledNodes,
        edges: edges.map((edge) => ({
          ...edge,
          selected: edge.id === selectedEdge,
        })),
        selectedTable,
        selectedEdge,
        sourceOrigin:
          state.sourceOrigin === 'editor'
            ? 'editor'
            : state.sourceOrigin,
        syncStatus: 'synced',
        isParsing: false,
        parseError: null,
        layoutOnNextParse: replacePositions ? false : state.layoutOnNextParse,
      };
    });
  },

  setParseFailure: (generation, parseError, syncStatus) =>
    set((state) =>
      generation === state.parseGeneration
        ? {
            parseError,
            syncStatus,
            isParsing: false,
          }
        : state,
    ),
  setSelectedTable: (name) =>
    set((state) => ({
      selectedTable: name,
      selectedEdge: name ? null : state.selectedEdge,
      nodes: state.nodes.map((node) => ({
        ...node,
        selected: node.id === name,
      })),
      edges: name
        ? state.edges.map((edge) => ({ ...edge, selected: false }))
        : state.edges,
    })),
  setSelectedEdge: (id) =>
    set((state) => ({
      selectedEdge: id,
      selectedTable: id ? null : state.selectedTable,
      edges: state.edges.map((edge) => ({
        ...edge,
        selected: edge.id === id,
      })),
      nodes: id
        ? state.nodes.map((node) => ({ ...node, selected: false }))
        : state.nodes,
    })),
  setHydrated: (v) => set({ hydrated: v }),

  addTable: (table: SchemaTable) => {
    if (!requireSynced('add a table')) return;
    const { ast } = get();
    const name = normalizeIdent(table.name);
    if (!name) {
      set({ statusMessage: 'Table name is required' });
      return;
    }
    if (ast.tables[name]) {
      set({ statusMessage: `Table "${name}" already exists` });
      return;
    }
    if (table.fields.length === 0) {
      set({ statusMessage: 'At least one column is required' });
      return;
    }
    if (hasDuplicateIdents(table.fields.map((field) => field.name))) {
      set({ statusMessage: 'Column names must be unique' });
      return;
    }
    get().pushHistory();
    const color = table.color || TABLE_COLORS[Object.keys(ast.tables).length % TABLE_COLORS.length];
    const fields = table.fields.map((field) => {
      const fieldName = normalizeIdent(field.name);
      return {
        ...field,
        id: `${name}.${fieldName}`,
        name: fieldName,
      };
    });
    const newTable: SchemaTable = {
      ...table,
      id: name,
      name,
      color,
      fields,
    };
    const newAST = { ...ast, tables: { ...ast.tables, [name]: newTable } };
    const newNode: Node = {
      id: name,
      type: 'table',
      position: table.position ?? { x: 0, y: 0 },
      data: { table: newTable },
      selected: true,
    };
    set({
      ast: newAST,
      nodes: [
        ...get().nodes.map((node) => ({ ...node, selected: false })),
        newNode,
      ],
      rawText: serializeDBML(newAST),
      selectedTable: newTable.name,
      selectedEdge: null,
      sourceOrigin: 'canvas',
      statusMessage: `Created table "${name}"`,
    });
  },

  deleteTable: (tableName: string) => {
    if (!requireSynced('delete a table')) return;
    const { ast, nodes, edges } = get();
    if (!ast.tables[tableName]) return;
    get().pushHistory();
    const newTables = { ...ast.tables };
    delete newTables[tableName];
    const newRefs: Record<string, SchemaReference> = {};
    for (const [id, r] of Object.entries(ast.references)) {
      if (r.sourceTable !== tableName && r.targetTable !== tableName) {
        newRefs[id] = r;
      }
    }
    const newAST = { ...ast, tables: newTables, references: newRefs };
    const selection = reconcileSelection(
      newAST,
      get().selectedTable === tableName ? null : get().selectedTable,
      get().selectedEdge,
    );
    set({
      ast: newAST,
      nodes: nodes
        .filter((n) => n.id !== tableName)
        .map((n) => ({ ...n, selected: n.id === selection.selectedTable })),
      edges: edges
        .filter((e) => e.source !== tableName && e.target !== tableName)
        .map((e) => ({ ...e, selected: e.id === selection.selectedEdge })),
      rawText: serializeDBML(newAST),
      selectedTable: selection.selectedTable,
      selectedEdge: selection.selectedEdge,
      sourceOrigin: 'canvas',
      statusMessage: `Dropped table "${tableName}"`,
    });
  },

  addFieldToTable: (tableName: string, field: SchemaField) => {
    if (!requireSynced('add a column')) return;
    const { ast } = get();
    if (!ast.tables[tableName]) return;
    const fieldName = normalizeIdent(field.name);
    if (!fieldName) {
      set({ statusMessage: 'Column name is required' });
      return;
    }
    const table = ast.tables[tableName];
    if (table.fields.some((existing) => existing.name === fieldName)) {
      set({ statusMessage: `Column "${fieldName}" already exists on ${tableName}` });
      return;
    }
    get().pushHistory();
    const nextField: SchemaField = {
      ...field,
      id: `${tableName}.${fieldName}`,
      name: fieldName,
    };
    const updatedTable = { ...table, fields: [...table.fields, nextField] };
    const newAST = { ...ast, tables: { ...ast.tables, [tableName]: updatedTable } };
    set((state) => ({
      ast: newAST,
      nodes: state.nodes.map((n) =>
        n.id === tableName ? { ...n, data: { table: updatedTable } } : n,
      ),
      rawText: serializeDBML(newAST),
      sourceOrigin: 'canvas',
      statusMessage: `Added column "${fieldName}" to ${tableName}`,
    }));
  },

  deleteField: (tableName: string, fieldName: string) => {
    if (!requireSynced('delete a column')) return;
    const { ast } = get();
    if (!ast.tables[tableName]) return;
    get().pushHistory();
    const table = ast.tables[tableName];
    const updatedTable = { ...table, fields: table.fields.filter((f) => f.name !== fieldName) };
    const newRefs: Record<string, SchemaReference> = {};
    for (const r of Object.values(ast.references)) {
      if (
        (r.sourceTable === tableName && r.sourceField === fieldName) ||
        (r.targetTable === tableName && r.targetField === fieldName)
      ) {
        continue;
      }
      newRefs[r.id] = r;
    }
    const newAST = { ...ast, tables: { ...ast.tables, [tableName]: updatedTable }, references: newRefs };
    set((state) => {
      const selection = reconcileSelection(
        newAST,
        state.selectedTable,
        state.selectedEdge,
      );
      return {
        ast: newAST,
        nodes: state.nodes.map((n) =>
          n.id === tableName
            ? {
                ...n,
                data: { table: updatedTable },
                selected: n.id === selection.selectedTable,
              }
            : { ...n, selected: n.id === selection.selectedTable },
        ),
        edges: Object.values(newRefs).map((r) => ({
          ...refToEdge(r),
          selected: r.id === selection.selectedEdge,
        })),
        rawText: serializeDBML(newAST),
        selectedTable: selection.selectedTable,
        selectedEdge: selection.selectedEdge,
        sourceOrigin: 'canvas',
        statusMessage: `Dropped column "${fieldName}" from ${tableName}`,
      };
    });
  },

  addReference: (ref: SchemaReference) => {
    if (!requireSynced('add a relationship')) return;
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
    if (!requireSynced('update a column')) return;
    const { ast } = get();
    if (!ast.tables[tableName]) return;
    const table = ast.tables[tableName];
    const nextName = normalizeIdent(field.name);
    if (!nextName) {
      set({ statusMessage: 'Column name is required' });
      return;
    }
    if (
      nextName !== oldFieldName &&
      table.fields.some((existing) => existing.name === nextName)
    ) {
      set({ statusMessage: `Column "${nextName}" already exists on ${tableName}` });
      return;
    }
    get().pushHistory();
    field = {
      ...field,
      id: `${tableName}.${nextName}`,
      name: nextName,
    };
    const updatedTable: SchemaTable = {
      ...table,
      fields: table.fields.map((f) => (f.name === oldFieldName ? field : f)),
    };
    const newAST = { ...ast, tables: { ...ast.tables, [tableName]: updatedTable } };

    // Update references that referenced the old field name.
    const newRefs: Record<string, SchemaReference> = {};
    for (const r of Object.values(newAST.references)) {
      const nr = { ...r };
      if (r.sourceTable === tableName && r.sourceField === oldFieldName) {
        nr.sourceField = field.name;
      }
      if (r.targetTable === tableName && r.targetField === oldFieldName) {
        nr.targetField = field.name;
      }
      const newId = `ref_${nr.sourceTable}.${nr.sourceField}__${nr.targetTable}.${nr.targetField}`;
      nr.id = newId;
      newRefs[newId] = nr;
    }
    const fieldsWithIds = updatedTable.fields.map((f) =>
      f.name === field.name ? { ...f, id: `${tableName}.${f.name}` } : f,
    );
    const tableWithIds = { ...updatedTable, fields: fieldsWithIds };
    const finalAST = {
      ...newAST,
      tables: { ...newAST.tables, [tableName]: tableWithIds },
      references: newRefs,
    };

    set((state) => ({
      ast: finalAST,
      nodes: state.nodes.map((n) =>
        n.id === tableName ? { ...n, data: { table: tableWithIds } } : n,
      ),
      edges: Object.values(newRefs).map((r) => refToEdge(r)),
      rawText: serializeDBML(finalAST),
      sourceOrigin: 'canvas',
      statusMessage: `Updated column "${field.name}" in ${tableName}`,
    }));
  },

  deleteReference: (refId: string) => {
    if (!requireSynced('delete a relationship')) return;
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
      selectedEdge: get().selectedEdge === refId ? null : get().selectedEdge,
      sourceOrigin: 'canvas',
      statusMessage: `Dropped relationship`,
    });
  },

  updateReference: (refId: string, patch: Partial<SchemaReference>) => {
    if (!requireSynced('update a relationship')) return;
    const { ast } = get();
    const ref = ast.references[refId];
    if (!ref) return;
    get().pushHistory();
    const updated: SchemaReference = { ...ref, ...patch };
    const newId = `ref_${updated.sourceTable}.${updated.sourceField}__${updated.targetTable}.${updated.targetField}`;
    updated.id = newId;
    const newRefs = { ...ast.references };
    delete newRefs[refId];
    newRefs[newId] = updated;
    const newAST = { ...ast, references: newRefs };
    const newEdge: Edge = refToEdge(updated);
    const selectedEdge = get().selectedEdge === refId ? newId : get().selectedEdge;
    set({
      ast: newAST,
      edges: get().edges.map((e) =>
        e.id === refId
          ? { ...newEdge, selected: newId === selectedEdge }
          : { ...e, selected: e.id === selectedEdge },
      ),
      selectedEdge,
      rawText: serializeDBML(newAST),
      sourceOrigin: 'canvas',
      statusMessage: `Updated relationship`,
    });
  },

  setTableColor: (tableName: string, color: string) => {
    if (!requireSynced('change a table color')) return;
    const { ast } = get();
    if (!ast.tables[tableName] || ast.tables[tableName].color === color) return;
    get().pushHistory();
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
      statusMessage: `Updated color for ${tableName}`,
    }));
  },

  setTableNote: (tableName: string, note: string) => {
    if (!requireSynced('update a table note')) return;
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
      rawText: serializeDBML(newAST),
      sourceOrigin: 'canvas',
    }));
  },

  setFieldNote: (tableName: string, fieldName: string, note: string) => {
    if (!requireSynced('update a column note')) return;
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
      rawText: serializeDBML(newAST),
      sourceOrigin: 'canvas',
    }));
  },

  moveField: (tableName: string, fromIndex: number, toIndex: number) => {
    if (!requireSynced('reorder columns')) return;
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
    if (!requireSynced('rename a table')) return;
    const { ast } = get();
    const table = ast.tables[oldName];
    const nextName = normalizeIdent(newName);
    if (!table || !nextName) return;
    if (nextName === oldName) return;
    if (ast.tables[nextName]) {
      set({ statusMessage: `Table "${nextName}" already exists` });
      return;
    }
    get().pushHistory();
    newName = nextName;

    const newTables: Record<string, SchemaTable> = {};
    for (const [name, t] of Object.entries(ast.tables)) {
      if (name === oldName) {
        newTables[newName] = {
          ...t,
          name: newName,
          id: newName,
          fields: t.fields.map((field) => ({
            ...field,
            id: `${newName}.${field.name}`,
          })),
        };
      } else {
        newTables[name] = t;
      }
    }

    const newRefs: Record<string, SchemaReference> = {};
    for (const r of Object.values(ast.references)) {
      const nr = { ...r };
      if (nr.sourceTable === oldName) nr.sourceTable = newName;
      if (nr.targetTable === oldName) nr.targetTable = newName;
      const newId = `ref_${nr.sourceTable}.${nr.sourceField}__${nr.targetTable}.${nr.targetField}`;
      nr.id = newId;
      newRefs[newId] = nr;
    }

    const newAST: DatabaseAST = { ...ast, tables: newTables, references: newRefs };
    set((state) => {
      const selectedEdge = state.selectedEdge
        ? Object.values(newRefs).find((reference) => {
            const previous = ast.references[state.selectedEdge!];
            return (
              previous &&
              reference.sourceField === previous.sourceField &&
              reference.targetField === previous.targetField &&
              (previous.sourceTable === oldName
                ? reference.sourceTable === newName
                : reference.sourceTable === previous.sourceTable) &&
              (previous.targetTable === oldName
                ? reference.targetTable === newName
                : reference.targetTable === previous.targetTable)
            );
          })?.id ?? null
        : null;
      return {
        ast: newAST,
        nodes: state.nodes.map((n) =>
          n.id === oldName
            ? {
                ...n,
                id: newName,
                data: { table: newTables[newName] },
                selected: true,
              }
            : { ...n, selected: false },
        ),
        edges: Object.values(newRefs).map((r) => ({
          ...refToEdge(r),
          selected: r.id === selectedEdge,
        })),
        rawText: serializeDBML(newAST),
        selectedTable: newName,
        selectedEdge,
        sourceOrigin: 'canvas',
        statusMessage: `Renamed table "${oldName}" → "${newName}"`,
      };
    });
  },

  captureSnapshot: () => {
    const { ast } = get();
    set({ previousAST: JSON.parse(JSON.stringify(ast)) });
  },

  setPreviousAST: (ast) =>
    set({ previousAST: ast ? JSON.parse(JSON.stringify(ast)) : null }),

  setStatusMessage: (msg: string) => set({ statusMessage: msg }),

  applyNodePositionsToAST: () => {
    const { ast, nodes } = get();
    set({ ast: syncNodePositions(ast, nodes) });
  },

  replaceWorkspace: (input) => {
    const state = get();
    if (input.recordHistory !== false && workspaceHasContent(state)) {
      get().pushHistory();
    }

    if (input.ast) {
      const selection = reconcileSelection(
        input.ast,
        state.selectedTable,
        state.selectedEdge,
      );
      const nodes =
        input.nodes?.map((node) => ({
          ...node,
          selected: node.id === selection.selectedTable,
        })) ?? tablesToNodes(input.ast, selection.selectedTable);
      const edges =
        input.edges?.map((edge) => ({
          ...edge,
          selected: edge.id === selection.selectedEdge,
        })) ?? refsToEdges(input.ast, selection.selectedEdge);
      const rawText = sanitizeDbmlText(input.rawText ?? serializeDBML(input.ast));
      const origin = input.origin;
      set({
        ast: input.ast,
        nodes,
        edges,
        rawText,
        selectedTable: selection.selectedTable,
        selectedEdge: selection.selectedEdge,
        sourceOrigin: origin,
        syncStatus: origin === 'editor' ? 'parsing' : 'synced',
        isParsing: origin === 'editor',
        parseError: null,
        parseGeneration: state.parseGeneration + 1,
        visualGesture: null,
        statusMessage: input.statusMessage ?? state.statusMessage,
        layoutOnNextParse: false,
        ...(input.resetHistory
          ? { undoStack: [], redoStack: [] }
          : {}),
      });
      return;
    }

    if (input.rawText !== undefined) {
      set({
        rawText: sanitizeDbmlText(input.rawText),
        sourceOrigin: input.origin,
        syncStatus: 'parsing',
        isParsing: true,
        parseError: null,
        selectedTable: null,
        selectedEdge: null,
        visualGesture: null,
        statusMessage: input.statusMessage ?? state.statusMessage,
        ...(input.resetHistory
          ? { undoStack: [], redoStack: [] }
          : {}),
      });
    }
  },

  resetTo: (ast, nodes, edges) => {
    get().replaceWorkspace({
      ast,
      nodes,
      edges,
      origin: 'canvas',
      recordHistory: false,
    });
  },

  pushHistory: () => {
    const state = get();
    const snapshot = captureHistory(state);
    set({
      undoStack: [...state.undoStack, snapshot].slice(-50),
      redoStack: [],
    });
  },

  beginVisualGesture: () => {
    const state = get();
    if (state.visualGesture || !requireSynced('move tables')) return;
    set({ visualGesture: captureHistory(state) });
  },

  endVisualGesture: () => {
    const { visualGesture, undoStack, ast, nodes } = get();
    if (!visualGesture) return;
    const moved = nodes.some((node) => {
      const previous = visualGesture.nodes.find((item) => item.id === node.id);
      return (
        !previous ||
        previous.position.x !== node.position.x ||
        previous.position.y !== node.position.y
      );
    });
    set({
      visualGesture: null,
      ast: syncNodePositions(ast, nodes),
      ...(moved
        ? {
            undoStack: [...undoStack, visualGesture].slice(-50),
            redoStack: [],
            sourceOrigin: 'canvas' as const,
            statusMessage: 'Moved table(s)',
          }
        : {}),
    });
  },

  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    const current = captureHistory(get());
    const selection = reconcileSelection(
      prev.ast,
      prev.selectedTable,
      prev.selectedEdge,
    );
    set({
      ast: prev.ast,
      nodes: prev.nodes.map((node) => ({
        ...node,
        selected: node.id === selection.selectedTable,
      })),
      edges: prev.edges.map((edge) => ({
        ...edge,
        selected: edge.id === selection.selectedEdge,
      })),
      rawText: prev.rawText,
      selectedTable: selection.selectedTable,
      selectedEdge: selection.selectedEdge,
      sourceOrigin: 'canvas',
      syncStatus: 'synced',
      isParsing: false,
      parseError: null,
      parseGeneration: get().parseGeneration + 1,
      visualGesture: null,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, current],
      statusMessage: 'Undid last action',
    });
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const current = captureHistory(get());
    const selection = reconcileSelection(
      next.ast,
      next.selectedTable,
      next.selectedEdge,
    );
    set({
      ast: next.ast,
      nodes: next.nodes.map((node) => ({
        ...node,
        selected: node.id === selection.selectedTable,
      })),
      edges: next.edges.map((edge) => ({
        ...edge,
        selected: edge.id === selection.selectedEdge,
      })),
      rawText: next.rawText,
      selectedTable: selection.selectedTable,
      selectedEdge: selection.selectedEdge,
      sourceOrigin: 'canvas',
      syncStatus: 'synced',
      isParsing: false,
      parseError: null,
      parseGeneration: get().parseGeneration + 1,
      visualGesture: null,
      undoStack: [...undoStack, current],
      redoStack: redoStack.slice(0, -1),
      statusMessage: 'Redid action',
    });
  },

  loadAST: (ast: DatabaseAST) => {
    get().replaceWorkspace({
      ast,
      origin: 'canvas',
      recordHistory: false,
      resetHistory: true,
      statusMessage: 'Workspace loaded',
    });
  },

  hydrateWorkspace: (ast: DatabaseAST, rawText: string) => {
    const nodes: Node[] = Object.values(ast.tables).map((table) => ({
      id: table.name,
      type: 'table',
      position: table.position ?? { x: 0, y: 0 },
      data: { table },
    }));
    const edges: Edge[] = Object.values(ast.references).map((reference) =>
      refToEdge(reference),
    );
    const collapsed = positionsCollapsed(nodes);
    set({
      ast,
      nodes: collapsed ? [] : nodes,
      edges,
      layoutOnNextParse: collapsed || get().layoutOnNextParse,
      rawText: sanitizeDbmlText(rawText),
      sourceOrigin: 'editor',
      syncStatus: 'parsing',
      parseGeneration: get().parseGeneration + 1,
      parseError: null,
      isParsing: true,
      selectedTable: null,
      selectedEdge: null,
      undoStack: [],
      redoStack: [],
      visualGesture: null,
    });
  },
  };
});
