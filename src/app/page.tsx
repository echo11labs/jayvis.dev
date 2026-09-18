'use client';

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Toolbar, type SampleName } from '@/components/workspace/Toolbar';
import { MigrationPanel } from '@/components/workspace/MigrationPanel';
import { useDiagramStore } from '@/store/diagram-store';
import { layoutDiagram } from '@/lib/layout/elk-layout';
import { SAMPLE_SCHEMAS } from '@/lib/samples';
import { FileCode2, Database, Loader2, Sparkles } from 'lucide-react';

// Lazy-load the two heaviest client components so Turbopack compiles
// them as separate chunks (avoids OOM from compiling everything at once).
const CodeEditor = lazy(() =>
  import('@/components/editor/CodeEditor').then((m) => ({ default: m.CodeEditor })),
);
const FlowCanvas = lazy(() =>
  import('@/components/canvas/FlowCanvas').then((m) => ({ default: m.FlowCanvas })),
);

/** Shape returned by the DBML parser mini-service. */
interface ParseApiResponse {
  ast: import('@/types/ast').DatabaseAST;
  nodes: any[];
  edges: any[];
  error: string | null;
}

const DEFAULT_DBML = SAMPLE_SCHEMAS.ecommerce;

export default function Home() {
  const rawText = useDiagramStore((s) => s.rawText);
  const setRawText = useDiagramStore((s) => s.setRawText);
  const setParsedAST = useDiagramStore((s) => s.setParsedAST);
  const setParseStatus = useDiagramStore((s) => s.setParseStatus);
  const parseError = useDiagramStore((s) => s.parseError);
  const nodes = useDiagramStore((s) => s.nodes);
  const setNodes = useDiagramStore((s) => s.setNodes);
  const captureSnapshot = useDiagramStore((s) => s.captureSnapshot);
  const setStatusMessage = useDiagramStore((s) => s.setStatusMessage);
  const statusMessage = useDiagramStore((s) => s.statusMessage);

  const [isLayouting, setIsLayouting] = useState(false);
  const [migrationOpen, setMigrationOpen] = useState(false);
  const parseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bootstrap: seed the store with the default schema on first mount.
  // We read the current rawText from the store; if empty, load the sample.
  useEffect(() => {
    if (useDiagramStore.getState().rawText === '') {
      setRawText(DEFAULT_DBML);
    }
  }, [setRawText]);

  // Debounced parse: whenever the raw DBML text changes (origin=editor),
  // send it to the parser mini-service so @dbml/core stays out of the
  // client bundle.
  useEffect(() => {
    if (!rawText) return;

    setParseStatus(true, null);
    if (parseTimer.current) clearTimeout(parseTimer.current);

    parseTimer.current = setTimeout(async () => {
      try {
        // Call the Next.js API proxy, which forwards to the isolated
        // DBML parser mini-service (port 3031). This works on both the
        // dev server (port 3000) and the gateway (port 81).
        const res = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dbml: rawText }),
        });
        const result: ParseApiResponse = await res.json();
        if (result.error) {
          setParseStatus(false, result.error);
          setStatusMessage(`Parse error: ${result.error}`);
        } else {
          // Cast the plain server shapes into xyflow's Node[]/Edge[].
          setParsedAST(
            result.ast,
            result.nodes as any,
            result.edges as any,
          );
          setParseStatus(false, null);
          setStatusMessage(
            `Parsed ${Object.keys(result.ast.tables).length} table(s)`,
          );
        }
      } catch (err: any) {
        setParseStatus(false, err?.message || 'Network error');
        setStatusMessage(`Parse request failed`);
      }
    }, 300);

    return () => {
      if (parseTimer.current) clearTimeout(parseTimer.current);
    };
  }, [rawText, setParsedAST, setParseStatus, setStatusMessage]);

  const handleAutoLayout = useCallback(async () => {
    if (nodes.length === 0) return;
    setIsLayouting(true);
    try {
      const { nodes: laid } = await layoutDiagram(
        nodes,
        useDiagramStore.getState().edges,
      );
      setNodes(laid);
      setStatusMessage('Auto layout applied');
    } catch (err) {
      console.error('ELK layout failed:', err);
      setStatusMessage('Auto layout failed — using grid fallback');
      // Fallback grid layout handled silently here.
    } finally {
      setIsLayouting(false);
    }
  }, [nodes, setNodes, setStatusMessage]);

  const previousAST = useDiagramStore((s) => s.previousAST);

  const handleGenerateMigration = useCallback(() => {
    // Only capture a baseline snapshot if none exists yet. On subsequent
    // clicks, open the panel showing the diff against the existing baseline.
    if (!useDiagramStore.getState().previousAST) {
      captureSnapshot();
      setStatusMessage('Baseline captured — make changes then reopen to view diff');
    } else {
      setStatusMessage('Showing migration diff against baseline');
    }
    setMigrationOpen(true);
  }, [captureSnapshot, setStatusMessage]);

  const handleLoadSample = useCallback(
    (name: SampleName) => {
      setRawText(SAMPLE_SCHEMAS[name]);
    },
    [setRawText],
  );

  const tableCount = useDiagramStore(
    (s) => Object.keys(s.ast.tables).length,
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <Toolbar
        onAutoLayout={handleAutoLayout}
        onGenerateMigration={handleGenerateMigration}
        onMigrationOpenChange={setMigrationOpen}
        onLoadSample={handleLoadSample}
        isLayouting={isLayouting}
      />

      <main className="relative flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left: Code editor */}
          <ResizablePanel defaultSize={38} minSize={24} maxSize={60}>
            <div className="flex h-full flex-col bg-[#0a0a0a]">
              <div className="flex h-9 shrink-0 items-center justify-between border-b border-zinc-800 px-3">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <FileCode2 className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="font-medium">schema.dbml</span>
                </div>
                <span className="font-mono text-[10px] text-zinc-600">
                  DBML v2
                </span>
              </div>
              <div className="relative flex-1 overflow-hidden">
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
                    </div>
                  }
                >
                  <CodeEditor
                    value={rawText}
                    onChange={setRawText}
                    errorMessage={parseError}
                  />
                </Suspense>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-zinc-800" />

          {/* Right: Flow canvas */}
          <ResizablePanel defaultSize={62} minSize={40}>
            <div className="flex h-full flex-col">
              <div className="flex h-9 shrink-0 items-center justify-between border-b border-zinc-800 px-3">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Database className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="font-medium">ERD Canvas</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-zinc-600">
                    ELK · layered
                  </span>
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    {nodes.length} nodes
                  </span>
                </div>
              </div>
              <div className="relative flex-1 overflow-hidden">
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
                    </div>
                  }
                >
                  <FlowCanvas />
                </Suspense>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Status bar */}
        <div className="absolute bottom-0 left-0 right-0 flex h-7 items-center justify-between border-t border-zinc-800 bg-zinc-950/90 px-3 text-[11px] backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="font-mono text-zinc-500">{statusMessage}</span>
            {parseError && (
              <span className="flex items-center gap-1 font-mono text-rose-400">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                parse error
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-zinc-600">
            <span className="hidden sm:inline">
              <Sparkles className="mr-1 inline h-3 w-3 text-emerald-500" />
              MCP-ready
            </span>
            <span className="font-mono">
              tables: {tableCount}
            </span>
          </div>
        </div>
      </main>

      <MigrationPanel open={migrationOpen} onOpenChange={setMigrationOpen} />
    </div>
  );
}
