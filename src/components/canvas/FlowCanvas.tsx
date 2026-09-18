'use client';

import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Node,
  type Edge,
  type EdgeProps,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useDiagramStore } from '@/store/diagram-store';
import { TableNode, type TableNodeData } from '@/components/canvas/TableNode';
import { EdgeContextMenu } from '@/components/canvas/EdgeContextMenu';
import { SchemaSearch } from '@/components/canvas/SchemaSearch';

const nodeTypes = { table: TableNode };

interface EdgeMenuState {
  edgeId: string | null;
  x: number;
  y: number;
}

function FlowCanvasInner() {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const onNodesChange = useDiagramStore((s) => s.onNodesChange);
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange);
  const onConnect = useDiagramStore((s) => s.onConnect);
  const setSelectedTable = useDiagramStore((s) => s.setSelectedTable);
  const { fitView } = useReactFlow();
  const [edgeMenu, setEdgeMenu] = useState<EdgeMenuState>({
    edgeId: null,
    x: 0,
    y: 0,
  });

  const prevCountRef = useRef(0);

  useEffect(() => {
    if (nodes.length !== prevCountRef.current) {
      prevCountRef.current = nodes.length;
      if (nodes.length > 0) {
        const t = setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 80);
        return () => clearTimeout(t);
      }
    }
  }, [nodes.length, fitView]);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#6366F1', strokeWidth: 2 },
    }),
    [],
  );

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => setSelectedTable(node.id),
    [setSelectedTable],
  );
  const onPaneClick = useCallback(() => {
    setSelectedTable(null);
    setEdgeMenu({ edgeId: null, x: 0, y: 0 });
  }, [setSelectedTable]);

  const onEdgeContextMenu = useCallback(
    (e: React.MouseEvent, edge: Edge) => {
      e.preventDefault();
      setEdgeMenu({ edgeId: edge.id, x: e.clientX, y: e.clientY });
    },
    [],
  );

  return (
    <div className="relative h-full w-full bg-[#0a0a0a]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onEdgeContextMenu={onEdgeContextMenu}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionRadius={28}
        fitView
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        className="bg-zinc-950"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#27272a" />
        <Controls
          className="!border !border-zinc-800 !bg-zinc-900/95 !rounded-lg !shadow-2xl [&_button]:!border-zinc-800 [&_button]:!bg-zinc-900 [&_button]:!text-zinc-300 [&_button:hover]:!bg-zinc-800 [&_svg]:!fill-zinc-300"
          showInteractive={false}
        />
        <MiniMap
          className="!border !border-zinc-800 !bg-zinc-900/95 !rounded-lg !shadow-2xl"
          nodeColor={(node: Node<TableNodeData>) =>
            (node.data?.table?.color as string) || '#6366F1'
          }
          nodeStrokeWidth={3}
          nodeStrokeColor="#0a0a0a"
          maskColor="rgba(0,0,0,0.65)"
          pannable
          zoomable
        />
      </ReactFlow>

      <SchemaSearch />

      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <svg
              className="h-8 w-8 text-zinc-700"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <div className="text-lg font-semibold text-zinc-700">Empty Canvas</div>
          <p className="max-w-sm text-sm text-zinc-600">
            Write DBML in the editor on the left, press{' '}
            <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
              ⌘T
            </kbd>{' '}
            to add a table, or load a sample schema.
          </p>
        </div>
      )}

      <EdgeContextMenu
        edgeId={edgeMenu.edgeId}
        x={edgeMenu.x}
        y={edgeMenu.y}
        onClose={() => setEdgeMenu({ edgeId: null, x: 0, y: 0 })}
      />
    </div>
  );
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
