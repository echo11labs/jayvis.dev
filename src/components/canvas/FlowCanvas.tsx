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
  const { fitView } = useReactFlow();

  const prevCountRef = useRef(0);

  // Auto-fit the view whenever the number of nodes changes
  // (e.g. after parsing new DBML or applying auto-layout).
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

  return (
    <div className="relative h-full w-full bg-[#0a0a0a]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        className="bg-zinc-950"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#27272a"
        />
        <Controls
          className="!border-zinc-800 !bg-zinc-900 !shadow-2xl [&_button]:!border-zinc-800 [&_button]:!bg-zinc-900 [&_button]:!text-zinc-300 [&_button:hover]:!bg-zinc-800 [&_svg]:!fill-zinc-300"
          showInteractive={false}
        />
        <MiniMap
          className="!border !border-zinc-800 !bg-zinc-900 !rounded-lg"
          nodeColor={(node: Node<TableNodeData>) =>
            (node.data?.table?.color as string) || '#6366F1'
          }
          nodeStrokeWidth={2}
          maskColor="rgba(0,0,0,0.6)"
          pannable
          zoomable
        />
      </ReactFlow>

      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <div className="text-3xl font-bold text-zinc-700">Empty Canvas</div>
          <p className="max-w-sm text-sm text-zinc-600">
            Write DBML in the editor on the left to render tables here, or load a
            sample schema to get started.
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
