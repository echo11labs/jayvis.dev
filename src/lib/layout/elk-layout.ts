import type { Node, Edge } from '@xyflow/react';

export interface LayoutOptions {
  algorithm?: string;
  direction?: 'RIGHT' | 'LEFT' | 'DOWN' | 'UP';
  nodeNodeBetweenLayers?: number;
  nodeNode?: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  algorithm: 'layered',
  direction: 'RIGHT',
  nodeNodeBetweenLayers: 120,
  nodeNode: 80,
};

/**
 * Runs the ELK layout algorithm against the current React Flow graph and
 * returns new nodes with computed positions. Edges are passed through.
 *
 * ELK is imported dynamically so its 1.6 MB bundled worker never enters
 * the initial client chunk — it is only fetched when the user actually
 * clicks "Auto Layout".
 */
export async function layoutDiagram(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {},
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (nodes.length === 0) return { nodes, edges };

  // Dynamic import — keeps elkjs out of the initial bundle.
  const ELK = (await import('elkjs/lib/elk.bundled.js')).default;
  const elk = new ELK();

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': opts.algorithm,
      'elk.direction': opts.direction,
      'elk.layered.spacing.nodeNodeBetweenLayers': String(opts.nodeNodeBetweenLayers),
      'elk.spacing.nodeNode': String(opts.nodeNode),
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.spacing.edgeNodeBetweenLayers': '60',
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: node.measured?.width ?? 280,
      height: node.measured?.height ?? 200,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layouted = await elk.layout(elkGraph);

  const updatedNodes = nodes.map((node) => {
    const layoutNode = layouted.children?.find((n: any) => n.id === node.id);
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
