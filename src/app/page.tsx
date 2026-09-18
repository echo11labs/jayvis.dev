'use client';

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Toolbar, type SampleName } from '@/components/workspace/Toolbar';
import { MigrationPanel } from '@/components/workspace/MigrationPanel';
import { InspectorPanel } from '@/components/workspace/InspectorPanel';
import { AddTableDialog } from '@/components/workspace/AddTableDialog';
import { ShortcutsOverlay } from '@/components/workspace/ShortcutsOverlay';
import { CommandPalette } from '@/components/workspace/CommandPalette';
import { ValidationPanel } from '@/components/workspace/ValidationPanel';
import { ValidationBadge } from '@/components/workspace/ValidationBadge';
import { UndoRedoButtons } from '@/components/workspace/UndoRedoButtons';
import { CanvasLegend } from '@/components/canvas/CanvasLegend';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { useDiagramStore } from '@/store/diagram-store';
import { layoutDiagram } from '@/lib/layout/elk-layout';
import { SAMPLE_SCHEMAS } from '@/lib/samples';
import { loadSchema, saveSchema } from '@/lib/persistence';
import { useTheme } from '@/hooks/use-theme-state';
import { FileCode2, Database, Loader2, Sparkles } from 'lucide-react';

const FlowCanvas = lazy(() =>
  import('@/components/canvas/FlowCanvas').then((m) => ({ default: m.FlowCanvas })),
);

interface ParseApiResponse {
  ast: import('@/types/ast').DatabaseAST;
  nodes: any[];
  edges: any[];
  error: string | null;
}

const DEFAULT_DBML = SAMPLE_SCHEMAS.ecommerce;

export default function Home() {
  const rawText = useDiagramStore((s) => s.rawText);
  const sourceOrigin = useDiagramStore((s) => s.sourceOrigin);
  const ast = useDiagramStore((s) => s.ast);
  const setRawText = useDiagramStore((s) => s.setRawText);
  const setParsedAST = useDiagramStore((s) => s.setParsedAST);
  const setParseStatus = useDiagramStore((s) => s.setParseStatus);
  const parseError = useDiagramStore((s) => s.parseError);
  const nodes = useDiagramStore((s) => s.nodes);
  const setNodes = useDiagramStore((s) => s.setNodes);
  const captureSnapshot = useDiagramStore((s) => s.captureSnapshot);
  const setStatusMessage = useDiagramStore((s) => s.setStatusMessage);
  const statusMessage = useDiagramStore((s) => s.statusMessage);
  const selectedTable = useDiagramStore((s) => s.selectedTable);
  const hydrated = useDiagramStore((s) => s.hydrated);
  const setHydrated = useDiagramStore((s) => s.setHydrated);

  const [isLayouting, setIsLayouting] = useState(false);
  const [migrationOpen, setMigrationOpen] = useState(false);
  const [addTableOpen, setAddTableOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const parseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theme = useTheme();
  const isDark = theme === 'dark';
  const shellBg = isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900';
  const editorPanelBg = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
  const headerBorder = isDark ? 'border-zinc-800' : 'border-zinc-200';
  const headerText = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const statusBorder = isDark ? 'border-zinc-800 bg-zinc-950/90' : 'border-zinc-200 bg-white/90';

  // Bootstrap: load persisted schema from IndexedDB, else the default sample.
  useEffect(() => {
    if (hydrated) return;
    setHydrated(true);
    if (useDiagramStore.getState().rawText === '') {
      setRawText(DEFAULT_DBML);
    }
    // Attempt to restore a persisted schema (best-effort, non-blocking).
    loadSchema()
      .then((persisted) => {
        if (persisted && Object.keys(persisted.tables).length > 0) {
          useDiagramStore.getState().loadAST(persisted);
          setStatusMessage('Restored saved schema from local storage');
        }
      })
      .catch(() => {});
  }, [hydrated, setHydrated, setRawText, setStatusMessage]);

  // Debounced parse — skip when origin is canvas/mcp (AST already updated).
  useEffect(() => {
    if (!rawText) return;
    if (sourceOrigin === 'canvas' || sourceOrigin === 'mcp') return;
    setParseStatus(true, null);
    if (parseTimer.current) clearTimeout(parseTimer.current);
    parseTimer.current = setTimeout(async () => {
      try {
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
          setParsedAST(result.ast, result.nodes as any, result.edges as any);
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
  }, [rawText, sourceOrigin, setParsedAST, setParseStatus, setStatusMessage]);

  // Auto-persist the AST + node positions to IndexedDB (debounced).
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      const currentAST = useDiagramStore.getState().ast;
      const currentNodes = useDiagramStore.getState().nodes;
      const persistable: import('@/types/ast').DatabaseAST = {
        ...currentAST,
        tables: Object.fromEntries(
          Object.entries(currentAST.tables).map(([name, table]) => {
            const node = currentNodes.find((n) => n.id === name);
            return [
              name,
              {
                ...table,
                position: node
                  ? { x: node.position.x, y: node.position.y }
                  : table.position,
              },
            ];
          }),
        ),
      };
      saveSchema(persistable);
    }, 1000);
    return () => clearTimeout(t);
  }, [hydrated, ast, nodes]);

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
      setStatusMessage('Auto layout failed');
    } finally {
      setIsLayouting(false);
    }
  }, [nodes, setNodes, setStatusMessage]);

  const handleGenerateMigration = useCallback(() => {
    if (!useDiagramStore.getState().previousAST) {
      captureSnapshot();
      setStatusMessage('Baseline captured — make changes then reopen to view diff');
    } else {
      setStatusMessage('Showing migration diff against baseline');
    }
    setMigrationOpen(true);
  }, [captureSnapshot, setStatusMessage]);

  const handleLoadSample = useCallback(
    (name: SampleName) => setRawText(SAMPLE_SCHEMAS[name]),
    [setRawText],
  );

  // Keyboard shortcuts.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      // ⌘Z / ⌃Z = undo, ⌘⇧Z / ⌃⇧Z = redo
      if (cmd && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        useDiagramStore.getState().undo();
        return;
      }
      if (cmd && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        useDiagramStore.getState().redo();
        return;
      }
      if (cmd && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleAutoLayout();
      }
      if (cmd && e.key === '0') {
        e.preventDefault();
        // Fit view — dispatched via a custom event the FlowCanvas listens for.
        window.dispatchEvent(new CustomEvent('stitchdb:fit-view'));
      }
      if (cmd && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setAddTableOpen(true);
      }
      if (cmd && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleGenerateMigration();
      }
      if (cmd && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (cmd && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setValidationOpen((v) => !v);
      }
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleAutoLayout, handleGenerateMigration]);

  const tableCount = useDiagramStore((s) => Object.keys(s.ast.tables).length);
  const fieldCount = useDiagramStore(
    (s) =>
      Object.values(s.ast.tables).reduce((acc, t) => acc + t.fields.length, 0),
  );

  return (
    <div className={`flex h-screen w-screen flex-col overflow-hidden ${shellBg}`}>
      <Toolbar
        onAutoLayout={handleAutoLayout}
        onGenerateMigration={handleGenerateMigration}
        onMigrationOpenChange={setMigrationOpen}
        onLoadSample={handleLoadSample}
        onAddTableOpenChange={setAddTableOpen}
        onShortcutsOpenChange={setShortcutsOpen}
        onCommandPaletteOpenChange={setPaletteOpen}
        isLayouting={isLayouting}
      />

      <main className="relative flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left: Code editor */}
          <ResizablePanel
            defaultSize={selectedTable ? 30 : 38}
            minSize={22}
            maxSize={60}
            order={1}
          >
            <div className={`flex h-full flex-col ${editorPanelBg}`}>
              <div className={`flex h-9 shrink-0 items-center justify-between border-b ${headerBorder} px-3`}>
                <div className={`flex items-center gap-2 text-xs ${headerText}`}>
                  <FileCode2 className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="font-medium">schema.dbml</span>
                  <span className={`ml-1 rounded px-1.5 py-0.5 font-mono text-[9px] ${isDark ? 'bg-zinc-900 text-zinc-500' : 'bg-zinc-100 text-zinc-500'}`}>
                    {rawText.length} chars
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <UndoRedoButtons />
                  <ValidationBadge onClick={() => setValidationOpen(true)} />
                  <button
                    onClick={() => setPaletteOpen(true)}
                    className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] transition-colors ${isDark ? 'border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300' : 'border-zinc-200 bg-zinc-50 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'}`}
                    title="Command palette"
                  >
                    ⌘K
                  </button>
                  <span className={`font-mono text-[10px] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>DBML v2</span>
                </div>
              </div>
              <div className="relative flex-1 overflow-hidden">
                <CodeEditor
                  value={rawText}
                  onChange={setRawText}
                  errorMessage={parseError}
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-zinc-800" />

          {/* Right: Flow canvas */}
          <ResizablePanel
            defaultSize={selectedTable ? 50 : 62}
            minSize={36}
            order={2}
          >
            <div className="flex h-full flex-col">
              <div className={`flex h-9 shrink-0 items-center justify-between border-b ${headerBorder} px-3`}>
                <div className={`flex items-center gap-2 text-xs ${headerText}`}>
                  <Database className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="font-medium">ERD Canvas</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`hidden font-mono text-[10px] sm:inline ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    ELK · layered
                  </span>
                  <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] ${isDark ? 'bg-zinc-900 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                    <Database className="h-2.5 w-2.5 text-indigo-400/70" />
                    {nodes.length} tables
                  </span>
                  <span className={`hidden rounded px-1.5 py-0.5 font-mono text-[10px] sm:inline ${isDark ? 'bg-zinc-900 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                    {fieldCount} cols
                  </span>
                  <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${isDark ? 'bg-zinc-900 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                    {useDiagramStore.getState().edges.length} refs
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
                <CanvasLegend />
              </div>
            </div>
          </ResizablePanel>

          {/* Inspector panel */}
          {selectedTable && (
            <>
              <ResizableHandle className="bg-zinc-800" />
              <ResizablePanel
                defaultSize={20}
                minSize={16}
                maxSize={30}
                order={3}
              >
                <InspectorPanel />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        {/* Status bar */}
        <div className={`absolute bottom-0 left-0 right-0 flex h-7 items-center justify-between border-t ${statusBorder} px-3 text-[11px] backdrop-blur-sm`}>
          <div className="flex items-center gap-3">
            <span className={`font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{statusMessage}</span>
            {parseError && (
              <span className="flex items-center gap-1 font-mono text-rose-400">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                parse error
              </span>
            )}
          </div>
          <div className={`flex items-center gap-3 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            <span className="hidden sm:inline">
              <Sparkles className="mr-1 inline h-3 w-3 text-emerald-500" />
              MCP-ready
            </span>
            <span className={`hidden sm:inline font-mono ${isDark ? 'text-zinc-700' : 'text-zinc-300'}`}>·</span>
            <span className="hidden sm:inline font-mono">
              saved locally
            </span>
            <span className="font-mono">tables: {tableCount}</span>
          </div>
        </div>
      </main>

      <MigrationPanel open={migrationOpen} onOpenChange={setMigrationOpen} />
      <ValidationPanel open={validationOpen} onOpenChange={setValidationOpen} />
      <AddTableDialog open={addTableOpen} onOpenChange={setAddTableOpen} />
      <ShortcutsOverlay open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onAutoLayout={handleAutoLayout}
        onGenerateMigration={handleGenerateMigration}
        onAddTableOpenChange={setAddTableOpen}
        onShortcutsOpenChange={setShortcutsOpen}
        onLoadSample={handleLoadSample}
        onValidationOpenChange={setValidationOpen}
      />
    </div>
  );
}
