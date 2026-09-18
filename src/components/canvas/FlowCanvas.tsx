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
import { PaneContextMenu } from '@/components/canvas/PaneContextMenu';
import { useTheme } from '@/hooks/use-theme-state';

const nodeTypes = { table: TableNode };

interface EdgeMenuState {
  edgeId: string | null;
  x: number;
  y: number;
}

interface PaneMenuState {
  open: boolean;
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
  const theme = useTheme();
  const isDark = theme === 'dark';

  // Theme-aware canvas tokens.
  const canvasBg = isDark ? '#0a0a0a' : '#f4f4f5';
  const reactFlowBg = isDark ? 'bg-zinc-950' : 'bg-zinc-100';
  const dotColor = isDark ? '#27272a' : '#d4d4d8';
  const controlsCls = isDark
    ? '!border-zinc-800 !bg-zinc-900/95 [&_button]:!border-zinc-800 [&_button]:!bg-zinc-900 [&_button]:!text-zinc-300 [&_button:hover]:!bg-zinc-800 [&_svg]:!fill-zinc-300'
    : '!border-zinc-200 !bg-white/95 [&_button]:!border-zinc-200 [&_button]:!bg-white [&_button]:!text-zinc-600 [&_button:hover]:!bg-zinc-100 [&_svg]:!fill-zinc-600';
  const minimapCls = isDark
    ? '!border-zinc-800 !bg-zinc-900/95'
    : '!border-zinc-200 !bg-white/95';
  const minimapMask = isDark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.7)';
  const emptyIcon = isDark ? 'text-zinc-700' : 'text-zinc-300';
  const emptyTitle = isDark ? 'text-zinc-700' : 'text-zinc-400';
  const emptyText = isDark ? 'text-zinc-600' : 'text-zinc-500';
  const emptyKbd = isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600';

  const [edgeMenu, setEdgeMenu] = useState<EdgeMenuState>({
    edgeId: null,
    x: 0,
    y: 0,
  });
  const [paneMenu, setPaneMenu] = useState<PaneMenuState>({
    open: false,
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

  // Listen for the ⌘0 "fit view" keyboard shortcut.
  useEffect(() => {
    const handler = () => {
      if (nodes.length > 0) fitView({ padding: 0.2, duration: 400 });
    };
    window.addEventListener('stitchdb:fit-view', handler);
    return () => window.removeEventListener('stitchdb:fit-view', handler);
  }, [nodes.length, fitView]);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#6366F1', strokeWidth: 2 },
      markerEnd: {
        type: 'arrowclosed' as const,
        width: 16,
        height: 16,
        color: '#6366F1',
      },
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
    setPaneMenu({ open: false, x: 0, y: 0 });
  }, [setSelectedTable]);

  const onPaneContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setPaneMenu({ open: true, x: e.clientX, y: e.clientY });
  }, []);

  const onEdgeContextMenu = useCallback(
    (e: React.MouseEvent, edge: Edge) => {
      e.preventDefault();
      setEdgeMenu({ edgeId: edge.id, x: e.clientX, y: e.clientY });
    },
    [],
  );

  // Highlight an edge on hover (thicker + brighter stroke).
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const onEdgeEnter = useCallback(
    (_e: React.MouseEvent, edge: Edge) => setHoveredEdge(edge.id),
    [],
  );
  const onEdgeLeave = useCallback(() => setHoveredEdge(null), []);

  const displayEdges = useMemo(
    () =>
      edges.map((e) =>
        hoveredEdge === e.id
          ? {
              ...e,
              style: {
                ...(e.style as object),
                stroke: '#818CF8',
                strokeWidth: 3,
              },
            }
          : e,
      ),
    [edges, hoveredEdge],
  );

  return (
    <div className="relative h-full w-full" style={{ background: canvasBg }}>
      <ReactFlow
        nodes={nodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onEdgeMouseEnter={onEdgeEnter}
        onEdgeMouseLeave={onEdgeLeave}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionRadius={28}
        fitView
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        className={reactFlowBg}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color={dotColor} />
        <Controls
          className={`!border !rounded-lg !shadow-2xl ${controlsCls}`}
          showInteractive={false}
        />
        <MiniMap
          className={`!border !rounded-lg !shadow-2xl ${minimapCls}`}
          nodeColor={(node: Node<TableNodeData>) =>
            (node.data?.table?.color as string) || '#6366F1'
          }
          nodeStrokeWidth={3}
          nodeStrokeColor={isDark ? '#0a0a0a' : '#ffffff'}
          maskColor={minimapMask}
          pannable
          zoomable
        />
      </ReactFlow>

      <SchemaSearch />

      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <svg
              className={`h-8 w-8 ${emptyIcon}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <div className={`text-lg font-semibold ${emptyTitle}`}>Empty Canvas</div>
          <p className={`max-w-sm text-sm ${emptyText}`}>
            Write DBML in the editor on the left, press{' '}
            <kbd className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${emptyKbd}`}>
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

      <PaneContextMenu
        open={paneMenu.open}
        x={paneMenu.x}
        y={paneMenu.y}
        onClose={() => setPaneMenu({ open: false, x: 0, y: 0 })}
        onAddTable={() => window.dispatchEvent(new CustomEvent('stitchdb:add-table'))}
        onAutoLayout={() => window.dispatchEvent(new CustomEvent('stitchdb:auto-layout'))}
        onFitView={() => window.dispatchEvent(new CustomEvent('stitchdb:fit-view'))}
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
