import type { Node, Edge } from '@xyflow/react';

export interface LayoutOptions {
  algorithm?: string;
  direction?: 'RIGHT' | 'LEFT' | 'DOWN' | 'UP';
  nodeNodeBetweenLayers?: number;
  nodeNode?: number;
  groupByDomain?: boolean;
  tableGroups?: Record<string, { name: string; tables: string[] }>;
}

const DEFAULT_OPTIONS: Required<Omit<LayoutOptions, 'tableGroups'>> = {
  algorithm: 'layered',
  direction: 'RIGHT',
  nodeNodeBetweenLayers: 90,
  nodeNode: 36,
  groupByDomain: false,
};

type ElkInstance = {
  layout: (graph: unknown) => Promise<{ children?: Array<{ id: string; x?: number; y?: number }> }>;
};

let elkInstance: Promise<ElkInstance> | null = null;

function loadElk(): Promise<ElkInstance> {
  if (!elkInstance) {
    elkInstance = import('elkjs/lib/elk.bundled.js').then(
      (mod) => new mod.default() as ElkInstance,
    );
  }
  return elkInstance;
}

/** Start the ELK download before the user asks for a layout. */
export function warmupLayout(): void {
  if (typeof window === 'undefined') return;
  void loadElk();
}

export interface NodeWithDim {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Estimates the rendered dimensions of a database table node card.
 * Uses actual measured values if available from ReactFlow, otherwise
 * computes based on table field count and card elements.
 */
export function estimateNodeDimensions(node: Node): { width: number; height: number } {
  const data = node.data as
    | { table?: { fields?: Array<{ constraints?: { isPrimaryKey?: boolean } }> } }
    | undefined;
  const fields = data?.table?.fields ?? [];
  const fieldCount = fields.length;
  const hasPk = fieldCount === 0 || fields.some((f) => f.constraints?.isPrimaryKey);

  // Table card geometry:
  // - Header: 42px (padding + table name + mark)
  // - Column row: 36px (h-9)
  // - No-PK warning bar: 26px
  // - Outer borders / padding: 4px
  const estimatedHeight = 42 + Math.max(1, fieldCount) * 36 + (!hasPk ? 26 : 0) + 4;
  const measuredHeight = node.measured?.height;
  const height =
    typeof measuredHeight === 'number' && measuredHeight > 50
      ? measuredHeight
      : estimatedHeight;

  const measuredWidth = node.measured?.width;
  const width =
    typeof measuredWidth === 'number' && measuredWidth > 100
      ? measuredWidth
      : 320;

  return { width, height };
}

/**
 * Compacts vertical voids within each layer column while preserving ELK's
 * crossing-minimized vertical order. Eliminates 3,000px+ gaps and aligns all
 * columns neatly starting from the top.
 */
export function compactColumnVoids(
  nodes: NodeWithDim[],
  direction: 'RIGHT' | 'LEFT' | 'DOWN' | 'UP' = 'RIGHT',
  gapBetweenNodes = 36,
  layerGap = 90,
  startCoord = 24,
): NodeWithDim[] {
  if (nodes.length <= 1) return nodes;

  const isHorizontalFlow = direction === 'RIGHT' || direction === 'LEFT';

  if (isHorizontalFlow) {
    // Sort nodes by X coordinate to discover discrete layer columns
    const sorted = [...nodes].sort((a, b) => a.x - b.x);
    const columns: NodeWithDim[][] = [];

    for (const node of sorted) {
      const lastCol = columns[columns.length - 1];
      if (!lastCol) {
        columns.push([node]);
      } else {
        const colBaseX = lastCol[0].x;
        // Nodes in the same layer have nearly identical X; adjacent layers are >= 350px apart
        if (Math.abs(node.x - colBaseX) < 140) {
          lastCol.push(node);
        } else {
          columns.push([node]);
        }
      }
    }

    let currentX = startCoord;
    const result: NodeWithDim[] = [];

    for (const col of columns) {
      // Sort vertically by original ELK Y to strictly preserve crossing minimization
      col.sort((a, b) => a.y - b.y);

      const maxColWidth = Math.max(...col.map((n) => n.width));
      let currentY = startCoord;

      for (const node of col) {
        result.push({
          ...node,
          x: currentX,
          y: currentY,
        });
        currentY += node.height + gapBetweenNodes;
      }

      currentX += maxColWidth + layerGap;
    }

    return result;
  } else {
    // Vertical flow (DOWN / UP): group into rows along Y, stack along X
    const sorted = [...nodes].sort((a, b) => a.y - b.y);
    const rows: NodeWithDim[][] = [];

    for (const node of sorted) {
      const lastRow = rows[rows.length - 1];
      if (!lastRow) {
        rows.push([node]);
      } else {
        const rowBaseY = lastRow[0].y;
        if (Math.abs(node.y - rowBaseY) < 140) {
          lastRow.push(node);
        } else {
          rows.push([node]);
        }
      }
    }

    let currentY = startCoord;
    const result: NodeWithDim[] = [];

    for (const row of rows) {
      row.sort((a, b) => a.x - b.x);
      const maxRowHeight = Math.max(...row.map((n) => n.height));
      let currentX = startCoord;

      for (const node of row) {
        result.push({
          ...node,
          x: currentX,
          y: currentY,
        });
        currentX += node.width + gapBetweenNodes;
      }

      currentY += maxRowHeight + layerGap;
    }

    return result;
  }
}



async function layoutSinglePod(
  podNodes: Node[],
  allEdges: Edge[],
  opts: Required<Omit<LayoutOptions, 'groupByDomain' | 'tableGroups'>>,
  elk: ElkInstance,
): Promise<{
  nodes: NodeWithDim[];
  width: number;
  height: number;
}> {
  if (podNodes.length === 0) return { nodes: [], width: 0, height: 0 };
  const podNodeIds = new Set(podNodes.map((n) => n.id));

  const childrenWithDims = podNodes.map((node) => {
    const dim = estimateNodeDimensions(node);
    return {
      id: node.id,
      width: dim.width,
      height: dim.height,
    };
  });

  const nodeDimMap = new Map(childrenWithDims.map((c) => [c.id, c]));

  if (podNodes.length === 1) {
    const single = childrenWithDims[0];
    return {
      nodes: [{ id: single.id, x: 0, y: 0, width: single.width, height: single.height }],
      width: single.width,
      height: single.height,
    };
  }

  const podEdges = allEdges
    .filter((edge) => podNodeIds.has(edge.source) && podNodeIds.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    }));

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': opts.algorithm,
      'elk.direction': opts.direction,
      'elk.layered.spacing.nodeNodeBetweenLayers': String(opts.nodeNodeBetweenLayers),
      'elk.spacing.nodeNode': String(opts.nodeNode),
      'elk.layered.thoroughness': '7',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.spacing.edgeNodeBetweenLayers': '40',
    },
    children: childrenWithDims,
    edges: podEdges,
  };

  const layouted = await elk.layout(elkGraph);
  const rawChildren: NodeWithDim[] = (layouted.children ?? []).map((c) => ({
    id: c.id,
    x: c.x ?? 0,
    y: c.y ?? 0,
    width: nodeDimMap.get(c.id)?.width ?? 320,
    height: nodeDimMap.get(c.id)?.height ?? 200,
  }));

  const compacted =
    opts.algorithm === 'layered'
      ? compactColumnVoids(rawChildren, opts.direction, opts.nodeNode, opts.nodeNodeBetweenLayers, 0)
      : rawChildren;

  const minX = Math.min(...compacted.map((n) => n.x));
  const minY = Math.min(...compacted.map((n) => n.y));
  const normalized = compacted.map((n) => ({
    ...n,
    x: n.x - minX,
    y: n.y - minY,
  }));

  const width = Math.max(...normalized.map((n) => n.x + n.width));
  const height = Math.max(...normalized.map((n) => n.y + n.height));

  return { nodes: normalized, width, height };
}

/**
 * Runs the ELK layout algorithm against the current React Flow graph and
 * returns new nodes with computed positions. Edges are passed through.
 *
 * When `groupByDomain` is enabled and table groups are defined, tables are
 * clustered into domain pods framed in a clean multi-row layout.
 */
export async function layoutDiagram(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {},
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (nodes.length === 0) return { nodes, edges };

  const elk = await loadElk();

  // If grouped domain layout is enabled and tableGroups are present
  const groups = options.tableGroups ? Object.values(options.tableGroups) : [];
  if (options.groupByDomain && groups.length > 0) {
    const tableToGroup = new Map<string, string>();
    for (const group of groups) {
      for (const tableName of group.tables) {
        tableToGroup.set(tableName, group.name);
      }
    }

    const podMap = new Map<string, Node[]>();
    for (const node of nodes) {
      const g = tableToGroup.get(node.id) ?? '__other__';
      const list = podMap.get(g) ?? [];
      list.push(node);
      podMap.set(g, list);
    }

    const laidOutPods: Array<{ pod: { nodes: NodeWithDim[]; width: number; height: number } }> = [];
    for (const groupNodes of podMap.values()) {
      const pod = await layoutSinglePod(groupNodes, edges, opts, elk);
      laidOutPods.push({ pod });
    }

    const POD_PAD_X = 28;
    const POD_PAD_TOP = 52;
    const POD_PAD_BOTTOM = 28;
    const POD_GAP_X = 100;
    const POD_GAP_Y = 100;
    const MAX_ROW_WIDTH = 2800;

    let cursorX = 36;
    let cursorY = 36;
    let rowMaxHeight = 0;
    const positions = new Map<string, { x: number; y: number }>();

    for (const { pod } of laidOutPods) {
      const fullPodWidth = pod.width + POD_PAD_X * 2;
      const fullPodHeight = pod.height + POD_PAD_TOP + POD_PAD_BOTTOM;

      if (cursorX > 36 && cursorX + fullPodWidth > MAX_ROW_WIDTH) {
        cursorX = 36;
        cursorY += rowMaxHeight + POD_GAP_Y;
        rowMaxHeight = 0;
      }

      for (const n of pod.nodes) {
        positions.set(n.id, {
          x: cursorX + POD_PAD_X + n.x,
          y: cursorY + POD_PAD_TOP + n.y,
        });
      }

      if (fullPodHeight > rowMaxHeight) {
        rowMaxHeight = fullPodHeight;
      }
      cursorX += fullPodWidth + POD_GAP_X;
    }

    const updatedNodes = nodes.map((node) => {
      const layoutNode = positions.get(node.id);
      return {
        ...node,
        position: {
          x: layoutNode?.x ?? node.position.x,
          y: layoutNode?.y ?? node.position.y,
        },
      };
    });

    return { nodes: updatedNodes, edges };
  }

  // Standard flat layout across all nodes
  const single = await layoutSinglePod(nodes, edges, opts, elk);
  const positions = new Map(single.nodes.map((n) => [n.id, { x: n.x + 24, y: n.y + 24 }]));

  const updatedNodes = nodes.map((node) => {
    const layoutNode = positions.get(node.id);
    return {
      ...node,
      position: {
        x: layoutNode?.x ?? node.position.x,
        y: layoutNode?.y ?? node.position.y,
      },
    };
  });

  return { nodes: updatedNodes, edges };
}

/**
 * Compact grid layout fallback — used when ELK fails (e.g. SSR / edge runtime).
 */
/** True when two or more tables share one point, which is how a fresh parse arrives. */
export function positionsCollapsed(
  nodes: Array<{ position: { x: number; y: number } }>,
): boolean {
  if (nodes.length < 2) return false;
  const seen = new Set<string>();
  for (const node of nodes) {
    const key = `${Math.round(node.position.x)}:${Math.round(node.position.y)}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

export async function layoutFreshNodes(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  if (nodes.length < 2) return nodes;
  try {
    const laid = await layoutDiagram(nodes, edges);
    return laid.nodes;
  } catch (err) {
    console.error('ELK layout failed:', err);
    return gridLayout(nodes);
  }
}

export function gridLayout(
  nodes: Node[],
  columns = 3,
  gapX = 340,
  gapY = 260,
  startX = 0,
  startY = 0,
): Node[] {
  return nodes.map((node, index) => ({
    ...node,
    position: {
      x: startX + (index % columns) * gapX,
      y: startY + Math.floor(index / columns) * gapY,
    },
  }));
}
