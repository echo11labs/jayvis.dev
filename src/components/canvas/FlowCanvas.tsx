'use client';

import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Node,
  type Edge,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useDiagramStore } from '@/store/diagram-store';
import { TableNode, type TableNodeData } from '@/components/canvas/TableNode';

const nodeTypes = { table: TableNode };

function FlowCanvasInner() {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const onNodesChange = useDiagramStore((s) => s.onNodesChange);
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange);
  const onConnect = useDiagramStore((s) => s.onConnect);
  const setSelectedTable = useDiagramStore((s) => s.setSelectedTable);
  const { fitView } = useReactFlow();

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
  const onPaneClick = useCallback(() => setSelectedTable(null), [setSelectedTable]);

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

      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          <div className="text-lg font-semibold text-zinc-700">Empty Canvas</div>
          <p className="max-w-sm text-sm text-zinc-600">
            Write DBML in the editor on the left, or load a sample schema.
          </p>
        </div>
      )}
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
