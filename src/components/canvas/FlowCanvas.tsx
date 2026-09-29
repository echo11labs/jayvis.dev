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
  type NodeTypes,
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
import { useWorkspaceSettings } from '@/hooks/use-workspace-settings';
import {
  tableIssueSeverity,
  validateSchema,
} from '@/lib/validation/schema-validation';

const nodeTypes: NodeTypes = { table: TableNode };

function clampMenuPosition(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const margin = 8;
  return {
    x: Math.max(margin, Math.min(x, window.innerWidth - width - margin)),
    y: Math.max(margin, Math.min(y, window.innerHeight - height - margin)),
  };
}

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
  const ast = useDiagramStore((s) => s.ast);
  const onNodesChange = useDiagramStore((s) => s.onNodesChange);
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange);
  const onConnect = useDiagramStore((s) => s.onConnect);
  const beginVisualGesture = useDiagramStore((s) => s.beginVisualGesture);
  const endVisualGesture = useDiagramStore((s) => s.endVisualGesture);
  const setSelectedTable = useDiagramStore((s) => s.setSelectedTable);
  const setSelectedEdge = useDiagramStore((s) => s.setSelectedEdge);
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const theme = useTheme();
  const isDark = theme === 'dark';
  const [settings] = useWorkspaceSettings();
  const syncStatus = useDiagramStore((s) => s.syncStatus);
  const parseError = useDiagramStore((s) => s.parseError);

  // Theme-aware canvas tokens.
  const canvasBg = 'var(--color-bg-canvas)';
  const reactFlowBg = 'react-flow-theme';
  const dotColor = 'var(--color-canvas-grid)';
  const controlsCls = '!border-[var(--color-border-subtle)] !bg-[var(--color-bg-app)] [&_button]:!border-[var(--color-border-subtle)] [&_button]:!bg-[var(--color-bg-app)] [&_button]:!text-[var(--color-text-primary)] [&_button:hover]:!bg-[var(--color-bg-tertiary)] [&_svg]:!fill-[var(--color-text-primary)]';
  const minimapCls = '!border-[var(--color-border-subtle)] !bg-[var(--color-bg-app)]';
  const minimapMask = isDark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.7)';
  const emptyIcon = 'text-[var(--color-text-muted)]';
  const emptyTitle = 'text-[var(--color-text-primary)]';
  const emptyText = 'text-[var(--color-text-muted)]';
  const emptyKbd = 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]';

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
    const previousCount = prevCountRef.current;
    prevCountRef.current = nodes.length;
    if (nodes.length > 0 && nodes.length > previousCount) {
      const timer = setTimeout(
        () => fitView({ padding: 0.2, duration: 400 }),
        80,
      );
      return () => clearTimeout(timer);
    }
  }, [nodes.length, fitView]);

  // Listen for the ⌘0 "fit view" keyboard shortcut.
  useEffect(() => {
    const handler = () => {
      if (nodes.length > 0) fitView({ padding: 0.2, duration: 400 });
    };
    window.addEventListener('jayvis:fit-view', handler);
    return () => window.removeEventListener('jayvis:fit-view', handler);
  }, [nodes.length, fitView]);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep',
      animated: true,
      style: { stroke: 'var(--color-accent-primary)', strokeWidth: 2 },
      markerEnd: {
        type: 'arrowclosed' as const,
        width: 16,
        height: 16,
        color: 'var(--color-accent-primary)',
      },
    }),
    [],
  );

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      setSelectedTable(node.id);
      setSelectedEdge(null);
      window.dispatchEvent(new Event('jayvis:open-inspector'));
      setEdgeMenu({ edgeId: null, x: 0, y: 0 });
      setPaneMenu({ open: false, x: 0, y: 0 });
    },
    [setSelectedEdge, setSelectedTable],
  );
  const onEdgeClick = useCallback(
    (_e: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge.id);
      setEdgeMenu({ edgeId: null, x: 0, y: 0 });
      setPaneMenu({ open: false, x: 0, y: 0 });
    },
    [setSelectedEdge],
  );
  const onPaneClick = useCallback(() => {
    setSelectedTable(null);
    setSelectedEdge(null);
    setEdgeMenu({ edgeId: null, x: 0, y: 0 });
    setPaneMenu({ open: false, x: 0, y: 0 });
  }, [setSelectedEdge, setSelectedTable]);

  const onPaneContextMenu = useCallback((e: React.MouseEvent<Element> | MouseEvent) => {
    e.preventDefault();
    const position = clampMenuPosition(e.clientX, e.clientY, 224, 190);
    setEdgeMenu({ edgeId: null, x: 0, y: 0 });
    setPaneMenu({ open: true, ...position });
  }, []);

  const onEdgeContextMenu = useCallback(
    (e: React.MouseEvent, edge: Edge) => {
      e.preventDefault();
      const position = clampMenuPosition(e.clientX, e.clientY, 240, 430);
      setSelectedEdge(edge.id);
      setPaneMenu({ open: false, x: 0, y: 0 });
      setEdgeMenu({ edgeId: edge.id, ...position });
    },
    [setSelectedEdge],
  );

  useEffect(() => {
    const zoomInHandler = () => zoomIn({ duration: 120 });
    const zoomOutHandler = () => zoomOut({ duration: 120 });
    window.addEventListener('jayvis:zoom-in', zoomInHandler);
    window.addEventListener('jayvis:zoom-out', zoomOutHandler);
    return () => {
      window.removeEventListener('jayvis:zoom-in', zoomInHandler);
      window.removeEventListener('jayvis:zoom-out', zoomOutHandler);
    };
  }, [zoomIn, zoomOut]);

  // Highlight an edge on hover (thicker + brighter stroke).
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const onEdgeEnter = useCallback(
    (_e: React.MouseEvent, edge: Edge) => setHoveredEdge(edge.id),
    [],
  );
  const onEdgeLeave = useCallback(() => setHoveredEdge(null), []);

  const displayEdges = useMemo(
    () =>
      edges.map((e) => {
        const ref = ast.references[e.id];
        const mark =
          ref?.cardinality === '1:1' ? '1:1' : ref?.cardinality === 'N:M' ? '*:*' : '1:*';
        const stroke =
          ref?.cardinality === '1:1'
            ? 'var(--color-accent-success)'
            : ref?.cardinality === 'N:M'
              ? 'var(--color-accent-warning)'
              : 'var(--color-accent-primary)';
        const labeled = {
          ...e,
          label: mark,
          style: {
            ...(typeof e.style === 'object' && e.style ? e.style : {}),
            stroke,
            strokeWidth: hoveredEdge === e.id ? 3 : 2,
            ...(hoveredEdge === e.id ? { filter: 'brightness(1.25)' } : {}),
          },
          markerEnd: {
            type: 'arrowclosed' as const,
            width: 16,
            height: 16,
            color: stroke,
          },
          labelStyle: {
            fill: 'var(--color-text-muted)',
            fontSize: 11,
            fontWeight: 500,
          },
          labelBgStyle: { fill: 'var(--color-bg-canvas)', fillOpacity: 1 },
          labelBgPadding: [8, 4] as [number, number],
          labelBgBorderRadius: 3,
        };
        return labeled;
      }),
    [ast.references, edges, hoveredEdge],
  );

  const issues = useMemo(() => validateSchema(ast), [ast]);
  const fkByTable = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const ref of Object.values(ast.references)) {
      const current = map.get(ref.sourceTable) ?? [];
      current.push(ref.sourceField);
      map.set(ref.sourceTable, current);
    }
    return map;
  }, [ast.references]);

  const displayNodes = useMemo(
    () =>
      nodes.map((node) => {
        const severity = tableIssueSeverity(issues, node.id);
        const data = node.data as TableNodeData;
        const fkFields = fkByTable.get(node.id) ?? [];
        const sameSeverity = (data.issueSeverity ?? null) === severity;
        const sameFk =
          (data.fkFields?.length ?? 0) === fkFields.length &&
          (data.fkFields ?? []).every((field, index) => field === fkFields[index]);
        if (sameSeverity && sameFk) return node;
        return {
          ...node,
          data: { ...data, issueSeverity: severity, fkFields },
        };
      }),
    [nodes, issues, fkByTable],
  );

  return (
    <div
      className="relative h-full w-full"
      style={{ background: canvasBg }}
    >
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={beginVisualGesture}
        onNodeDragStop={endVisualGesture}
        snapToGrid={settings.snap}
        snapGrid={[22, 22]}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
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
        className={reactFlowBg}
      >
        {settings.grid && (
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color={dotColor} />
        )}
        <Controls
          className={`!border ${controlsCls}`}
          showInteractive={false}
        />
        {settings.minimap && (
          <MiniMap
            className={`!border ${minimapCls}`}
            nodeColor={(node: Node<TableNodeData>) =>
              (node.data?.table?.color as string) || 'var(--color-accent-primary)'
            }
            nodeStrokeWidth={3}
            nodeStrokeColor={isDark ? '#0a0a0a' : '#ffffff'}
            maskColor={minimapMask}
            pannable
            zoomable
          />
        )}
      </ReactFlow>

      <SchemaSearch />

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border bg-[var(--color-bg-panel)] border-[var(--color-border-subtle)]`}>
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
          <div className={`text-lg font-semibold ${emptyTitle}`}>
            {syncStatus === 'offline'
              ? 'Parser offline'
              : syncStatus === 'invalid'
                ? 'Invalid DBML'
                : 'Empty Canvas'}
          </div>
          <p className={`max-w-sm text-sm ${emptyText}`}>
            {syncStatus === 'offline'
              ? parseError ||
                'The DBML parser service is unreachable. Start it and retry.'
              : syncStatus === 'invalid'
                ? parseError || 'Fix the editor draft before the canvas can update.'
                : 'Write DBML in the editor, press T to add a table, or load a sample schema.'}
          </p>
          {syncStatus === 'offline' && (
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent('jayvis:retry-parse'))
              }
              className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] hover:border-[var(--color-accent-primary)]"
            >
              Retry parser
            </button>
          )}
        </div>
      )}
      {nodes.length > 0 && syncStatus === 'offline' && (
        <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-md border border-amber-500/40 bg-[var(--color-bg-app)]/90 px-3 py-1.5 text-xs text-amber-300 shadow-lg">
          Parser offline — canvas is showing the last valid schema.{' '}
          <button
            type="button"
            className="underline"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('jayvis:retry-parse'))
            }
          >
            Retry
          </button>
        </div>
      )}
      {nodes.length > 0 && syncStatus === 'invalid' && (
        <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-md border border-rose-500/40 bg-[var(--color-bg-app)]/90 px-3 py-1.5 text-xs text-rose-300 shadow-lg">
          Invalid DBML — canvas edits are blocked until the draft parses.
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
        onAddTable={() => window.dispatchEvent(new CustomEvent('jayvis:add-table'))}
        onAutoLayout={() => window.dispatchEvent(new CustomEvent('jayvis:auto-layout'))}
        onFitView={() => window.dispatchEvent(new CustomEvent('jayvis:fit-view'))}
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
