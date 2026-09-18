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
  Origin,
} from '@/types/ast';

interface DiagramStoreState {
  ast: DatabaseAST;
  nodes: Node[];
  edges: Edge[];
  rawText: string;
  sourceOrigin: Origin;
  /** Snapshot captured whenever the user runs "Generate Migration". */
  previousAST: DatabaseAST | null;
  /** Transient parse / status messages surfaced to the UI. */
  statusMessage: string;
  /** True while the DBML text is being parsed into an AST. */
  isParsing: boolean;
  /** Last parse error message, if any. */
  parseError: string | null;

  setRawText: (text: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setParsedAST: (ast: DatabaseAST, nodes: Node[], edges: Edge[]) => void;
  setParseStatus: (isParsing: boolean, parseError: string | null) => void;
  addFieldToTable: (tableName: string, field: SchemaField) => void;
  addTable: (table: SchemaTable) => void;
  renameTable: (oldName: string, newName: string) => void;
  deleteTable: (tableName: string) => void;
  captureSnapshot: () => void;
  setStatusMessage: (msg: string) => void;
  applyNodePositionsToAST: () => void;
  resetTo: (ast: DatabaseAST, nodes: Node[], edges: Edge[]) => void;
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
    set((state) => ({
      edges: addEdge(
        {
          ...connection,
          animated: true,
          style: { stroke: '#6366F1', strokeWidth: 2 },
        },
        state.edges,
      ),
      sourceOrigin: 'canvas',
    }));
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, position } : node,
      ),
      sourceOrigin: 'canvas',
    }));
  },

  setParsedAST: (ast: DatabaseAST, nodes: Node[], edges: Edge[]) => {
    set((state) => {
      // Reconcile existing coordinates so user drag positions are not lost.
      const reconciledNodes = nodes.map((n) => {
        const existing = state.nodes.find((curr) => curr.id === n.id);
        return existing?.position ? { ...n, position: existing.position } : n;
      });

      // Persist positions stored on the AST back onto nodes if any.
      const withASTPositions = reconciledNodes.map((n) => {
        const t = ast.tables[n.id];
        if (t?.position && !state.nodes.find((c) => c.id === n.id)?.position) {
          return { ...n, position: t.position };
        }
        return n;
      });

      return {
        ast,
        nodes: withASTPositions,
        edges,
        sourceOrigin: 'none',
      };
    });
  },

  setParseStatus: (isParsing, parseError) => set({ isParsing, parseError }),

  addFieldToTable: (tableName: string, field: SchemaField) => {
    const { ast } = get();
    if (!ast.tables[tableName]) return;

    const updatedTables = {
      ...ast.tables,
      [tableName]: {
        ...ast.tables[tableName],
        fields: [...ast.tables[tableName].fields, field],
      },
    };

    set({
      ast: { ...ast, tables: updatedTables },
      sourceOrigin: 'mcp',
      statusMessage: `Added column "${field.name}" to ${tableName}`,
    });
  },

  addTable: (table: SchemaTable) => {
    const { ast } = get();
    set({
      ast: {
        ...ast,
        tables: { ...ast.tables, [table.name]: table },
      },
      sourceOrigin: 'mcp',
      statusMessage: `Created table "${table.name}"`,
    });
  },

  renameTable: (oldName: string, newName: string) => {
    const { ast, nodes, edges } = get();
    const table = ast.tables[oldName];
    if (!table) return;

    const newTables = { ...ast.tables };
    delete newTables[oldName];
    newTables[newName] = { ...table, name: newName, id: newName };

    const newNodes = nodes.map((n) =>
      n.id === oldName
        ? { ...n, id: newName, data: { ...n.data, table: newTables[newName] } }
        : n,
    );

    const newEdges = edges.map((e) => ({
      ...e,
      source: e.source === oldName ? newName : e.source,
      target: e.target === oldName ? newName : e.target,
    }));

    set({
      ast: { ...ast, tables: newTables },
      nodes: newNodes,
      edges: newEdges,
      sourceOrigin: 'canvas',
    });
  },

  deleteTable: (tableName: string) => {
    const { ast, nodes, edges } = get();
    const newTables = { ...ast.tables };
    delete newTables[tableName];

    const newNodes = nodes.filter((n) => n.id !== tableName);
    const newEdges = edges.filter(
      (e) => e.source !== tableName && e.target !== tableName,
    );

    set({
      ast: { ...ast, tables: newTables },
      nodes: newNodes,
      edges: newEdges,
      sourceOrigin: 'canvas',
      statusMessage: `Dropped table "${tableName}"`,
    });
  },

  captureSnapshot: () => {
    const { ast } = get();
    // Deep clone so future mutations do not affect the snapshot.
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
}));
