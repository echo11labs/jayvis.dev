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
  deleteField: (tableName: string, fieldName: string) => void;
  addReference: (ref: SchemaReference) => void;
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
    const newRefs = { ...ast.references, [ref.id]: ref };
    const newEdge: Edge = {
      id: ref.id,
      source: ref.sourceTable,
      target: ref.targetTable,
      sourceHandle: `${ref.sourceTable}.${ref.sourceField}-source`,
      targetHandle: `${ref.targetTable}.${ref.targetField}-target`,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#6366F1', strokeWidth: 2 },
      label: ref.cardinality,
    };
    const newAST = { ...ast, references: newRefs };
    set({
      ast: newAST,
      edges: [...get().edges, newEdge],
      rawText: serializeDBML(newAST),
      sourceOrigin: 'canvas',
      statusMessage: `Created relationship ${ref.sourceTable}.${ref.sourceField} → ${ref.targetTable}.${ref.targetField}`,
    });
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

  loadAST: (ast: DatabaseAST) => {
    const nodes: Node[] = Object.values(ast.tables).map((t) => ({
      id: t.name,
      type: 'table',
      position: t.position ?? { x: 0, y: 0 },
      data: { table: t },
    }));
    const edges: Edge[] = Object.values(ast.references).map((r) => ({
      id: r.id,
      source: r.sourceTable,
      target: r.targetTable,
      sourceHandle: `${r.sourceTable}.${r.sourceField}-source`,
      targetHandle: `${r.targetTable}.${r.targetField}-target`,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#6366F1', strokeWidth: 2 },
      label: r.cardinality,
    }));
    set({ ast, nodes, edges, sourceOrigin: 'none', previousAST: null, parseError: null });
  },
}));
