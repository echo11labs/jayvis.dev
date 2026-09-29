'use client';

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Toolbar,
  type CanvasView,
  type SampleName,
} from '@/components/workspace/Toolbar';
import { LeftPanel } from '@/components/workspace/LeftPanel';
import { StatusBar } from '@/components/workspace/StatusBar';
import { ContextPanel } from '@/components/workspace/ContextPanel';
import { MigrationPanel } from '@/components/workspace/MigrationPanel';
import { AddTableDialog } from '@/components/workspace/AddTableDialog';
import { ShortcutsOverlay } from '@/components/workspace/ShortcutsOverlay';
import { CommandPalette } from '@/components/workspace/CommandPalette';
import { ValidationPanel } from '@/components/workspace/ValidationPanel';
import { ThemePicker } from '@/components/workspace/ThemePicker';
import { SqlBuilderPanel } from '@/components/workspace/SqlBuilderPanel';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { useDiagramStore } from '@/store/diagram-store';
import { gridLayout, layoutDiagram, warmupLayout } from '@/lib/layout/elk-layout';
import { baselineSlot, buildMigration, clearBaselineStorage, readBaseline, readBaselineMap } from '@/lib/migrations';
import { SAMPLE_SCHEMAS } from '@/lib/samples';
import { loadWorkspace, openStudio, readStudio, saveWorkspace } from '@/lib/persistence';
import {
  activeBranch,
  activeWorkspace,
  addBranch,
  addWorkspace,
  clearCatalogStorage,
  createCatalog,
  readCatalog,
  renameActive,
  selectBranch,
  selectWorkspace,
  withActiveText,
  writeCatalog,
  type WorkspaceCatalog,
} from '@/lib/workspaces';
import { sanitizeDbmlText } from '@/lib/parser/dbml';
import {
  exportWorkspace,
  nodePositions,
  type ExportFormat,
} from '@/lib/export/workspace';
import { useTheme } from '@/hooks/use-theme-state';
import { useWorkspaceSettings } from '@/hooks/use-workspace-settings';
import { summarizeValidation } from '@/lib/validation/schema-validation';
import { Mark } from '@/lib/ui/marks';
import { toast } from 'sonner';
import { ConfirmActionDialog } from '@/components/workspace/ConfirmActionDialog';
import { confirmIf } from '@/lib/confirm-action';
import { EMPTY_AST, workspaceHasContent } from '@/store/diagram-store';

const FlowCanvas = lazy(() =>
  import('@/components/canvas/FlowCanvas').then((m) => ({ default: m.FlowCanvas })),
);

interface ParseApiResponse {
  ast: import('@/types/ast').DatabaseAST;
  nodes: any[];
  edges: any[];
  error: string | null;
  errorLine?: number | null;
  code?: string;
}

const DEFAULT_DBML = SAMPLE_SCHEMAS.ecommerce;
const LEFT_PANEL_STORAGE_KEY = 'jayvis-left-panel';
const WORKSPACE_NAME_KEY = 'jayvis-workspace-name';
const SAMPLE_WORKSPACES: Record<SampleName, string> = {
  ecommerce: 'ecommerce-db',
  blog: 'blog-db',
  saas: 'saas-db',
  auth: 'auth-db',
  analytics: 'analytics-db',
};

function inferWorkspaceName(text: string, fallback = 'workspace') {
  for (const [name, dbml] of Object.entries(SAMPLE_SCHEMAS) as Array<[SampleName, string]>) {
    if (text === dbml) return SAMPLE_WORKSPACES[name];
  }
  return fallback;
}

function readStoredNumber(key: string, legacyKey: string, fallback: number) {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key) ?? window.localStorage.getItem(legacyKey);
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export default function Home() {
  const rawText = useDiagramStore((s) => s.rawText);
  const sourceOrigin = useDiagramStore((s) => s.sourceOrigin);
  const ast = useDiagramStore((s) => s.ast);
  const setRawText = useDiagramStore((s) => s.setRawText);
  const armAutoLayout = useDiagramStore((s) => s.armAutoLayout);
  const setParsedAST = useDiagramStore((s) => s.setParsedAST);
  const beginParse = useDiagramStore((s) => s.beginParse);
  const setParseFailure = useDiagramStore((s) => s.setParseFailure);
  const parseError = useDiagramStore((s) => s.parseError);
  const nodes = useDiagramStore((s) => s.nodes);
  const setNodes = useDiagramStore((s) => s.setNodes);
  const captureSnapshot = useDiagramStore((s) => s.captureSnapshot);
  const setPreviousAST = useDiagramStore((s) => s.setPreviousAST);
  const setStatusMessage = useDiagramStore((s) => s.setStatusMessage);
  const statusMessage = useDiagramStore((s) => s.statusMessage);
  const selectedTable = useDiagramStore((s) => s.selectedTable);
  const selectedEdge = useDiagramStore((s) => s.selectedEdge);
  const setSelectedTable = useDiagramStore((s) => s.setSelectedTable);
  const setSelectedEdge = useDiagramStore((s) => s.setSelectedEdge);
  const hydrated = useDiagramStore((s) => s.hydrated);
  const setHydrated = useDiagramStore((s) => s.setHydrated);
  const hydrateWorkspace = useDiagramStore((s) => s.hydrateWorkspace);
  const isParsing = useDiagramStore((s) => s.isParsing);
  const syncStatus = useDiagramStore((s) => s.syncStatus);
  const previousAST = useDiagramStore((s) => s.previousAST);
  const [settings] = useWorkspaceSettings();
  const [parseNonce, setParseNonce] = useState(0);

  const [isLayouting, setIsLayouting] = useState(false);
  const [migrationOpen, setMigrationOpen] = useState(false);
  const [addTableOpen, setAddTableOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [sqlBuilderOpen, setSqlBuilderOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(300);
  const [activeView, setActiveView] = useState<CanvasView>('split');
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [workspaceName, setWorkspaceName] = useState('ecommerce-db');
  const [catalog, setCatalog] = useState<WorkspaceCatalog | null>(null);
  const [parseErrorLine, setParseErrorLine] = useState<number | null>(null);
  const parseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theme = useTheme();

  useEffect(() => {
    setLeftCollapsed(
      (window.localStorage.getItem(LEFT_PANEL_STORAGE_KEY) ??
        window.localStorage.getItem('stitchdb-left-panel')) === 'collapsed',
    );
    setLeftWidth(
      Math.min(360, Math.max(220, readStoredNumber('jayvis-left-width', 'stitchdb-left-width', 252))),
    );
    setRightWidth(
      Math.min(460, Math.max(220, readStoredNumber('jayvis-right-width', 'stitchdb-right-width', 300))),
    );
    const storedName = window.localStorage.getItem(WORKSPACE_NAME_KEY);
    if (storedName) setWorkspaceName(storedName);
  }, []);

  const { errors: validationErrors, warnings: validationWarnings } = useMemo(
    () => summarizeValidation(ast),
    [ast],
  );
  useEffect(() => {
    if (hydrated) return;
    let cancelled = false;
    (async () => {
      try {
        const studio = await readStudio();
        const persisted = studio?.snapshot ?? await loadWorkspace();
        if (cancelled) return;
        const seededText = persisted?.rawText
          ? sanitizeDbmlText(persisted.rawText)
          : DEFAULT_DBML;
        const seededName = inferWorkspaceName(
          seededText,
          window.localStorage.getItem(WORKSPACE_NAME_KEY) || 'ecommerce-db',
        );
        let nextCatalog = studio?.catalog ?? readCatalog();
        if (!nextCatalog) nextCatalog = createCatalog(seededName, seededText);
        if (!studio) {
          await openStudio({
            fileVersion: 1,
            snapshot: persisted ?? {
              workspaceVersion: 2,
              ast: { version: '1.0', tables: {}, references: {} },
              rawText: seededText,
              savedAt: Date.now(),
            },
            catalog: nextCatalog,
            baselines: readBaselineMap(),
            migrations: [],
          });
          clearCatalogStorage();
          clearBaselineStorage();
          window.localStorage.removeItem(WORKSPACE_NAME_KEY);
        }
        const workspace = activeWorkspace(nextCatalog);
        const branch = activeBranch(workspace);
        setCatalog(nextCatalog);
        setPreviousAST(
          readBaseline(baselineSlot(activeWorkspace(nextCatalog).id, activeBranch(activeWorkspace(nextCatalog)).name)),
        );
        setWorkspaceName(workspace.name);
        if (persisted && branch.rawText === sanitizeDbmlText(persisted.rawText)) {
          hydrateWorkspace(persisted.ast, branch.rawText);
        } else if (useDiagramStore.getState().rawText !== branch.rawText) {
          armAutoLayout();
          setRawText(branch.rawText);
        }
        setStatusMessage(
          persisted ? 'Restored saved workspace' : `Opened ${workspace.name}`,
        );
      } catch {
        if (!cancelled && useDiagramStore.getState().rawText === '') {
          setRawText(DEFAULT_DBML);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    armAutoLayout,
    hydrateWorkspace,
    hydrated,
    setHydrated,
    setPreviousAST,
    setRawText,
    setStatusMessage,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    if (sourceOrigin === 'canvas' || sourceOrigin === 'mcp') return;
    if (!rawText.trim()) {
      const generation = beginParse();
      setParsedAST(
        { version: '1.0', tables: {}, references: {} },
        [],
        [],
        generation,
      );
      setParseErrorLine(null);
      setStatusMessage('Empty schema');
      return;
    }
    if (parseTimer.current) clearTimeout(parseTimer.current);
    const controller = new AbortController();
    parseTimer.current = setTimeout(async () => {
      const generation = beginParse();
      try {
        const res = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dbml: rawText }),
          signal: controller.signal,
        });
        const result: ParseApiResponse = await res.json();
        if (controller.signal.aborted) return;
        if (
          useDiagramStore.getState().parseGeneration !== generation
        ) {
          return;
        }
        if (result.error) {
          const failureStatus =
            result.code?.startsWith('PARSER_') || res.status >= 500
              ? 'offline'
              : 'invalid';
          setParseFailure(generation, result.error, failureStatus);
          setParseErrorLine(result.errorLine ?? null);
          setStatusMessage(`Parse error: ${result.error}`);
        } else {
          let nextNodes = result.nodes as any[];
          const placeFresh = useDiagramStore.getState().layoutOnNextParse;
          if (
            placeFresh &&
            nextNodes.length > 1 &&
            useDiagramStore.getState().parseGeneration === generation
          ) {
            try {
              const laid = await layoutDiagram(nextNodes, result.edges as any);
              nextNodes = laid.nodes;
            } catch (err) {
              console.error('ELK layout failed:', err);
              nextNodes = gridLayout(nextNodes);
            }
          }
          if (controller.signal.aborted) return;
          if (useDiagramStore.getState().parseGeneration !== generation) return;
          setParsedAST(
            result.ast,
            nextNodes,
            result.edges as any,
            generation,
            { replacePositions: placeFresh && nextNodes.length > 1 },
          );
          if (placeFresh && nextNodes.length < 2) {
            useDiagramStore.setState({ layoutOnNextParse: false });
          }
          if (placeFresh && nextNodes.length > 1) {
            window.setTimeout(() => {
              window.dispatchEvent(new Event('jayvis:fit-view'));
            }, 120);
          }
          setParseErrorLine(null);
          setStatusMessage(
            `Parsed ${Object.keys(result.ast.tables).length} table(s)`,
          );
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        if (
          useDiagramStore.getState().parseGeneration !== generation
        ) {
          return;
        }
        setParseFailure(
          generation,
          err?.message || 'Network error',
          'offline',
        );
        setParseErrorLine(null);
        setStatusMessage('Parse request failed');
      }
    }, 160);
    return () => {
      if (parseTimer.current) clearTimeout(parseTimer.current);
      controller.abort();
    };
  }, [
    beginParse,
    hydrated,
    rawText,
    setParsedAST,
    setParseFailure,
    setStatusMessage,
    sourceOrigin,
    parseNonce,
  ]);

  useEffect(() => {
    warmupLayout();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !settings.autoSave) return;
    const timer = setTimeout(() => {
      const currentAST = useDiagramStore.getState().ast;
      const currentNodes = useDiagramStore.getState().nodes;
      const nodeById = new Map(currentNodes.map((node) => [node.id, node]));
      const persistable: import('@/types/ast').DatabaseAST = {
        ...currentAST,
        tables: Object.fromEntries(
          Object.entries(currentAST.tables).map(([name, table]) => {
            const node = nodeById.get(name);
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
      saveWorkspace({
        workspaceVersion: 2,
        ast: persistable,
        rawText,
        savedAt: Date.now(),
      });
      setCatalog((current) => {
        if (!current) return current;
        const next = withActiveText(current, rawText);
        if (next === current) return current;
        writeCatalog(next);
        return next;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [hydrated, ast, nodes, rawText, settings.autoSave]);

  const handleAutoLayout = useCallback(async () => {
    if (nodes.length === 0) return;
    setIsLayouting(true);
    try {
      const store = useDiagramStore.getState();
      const { nodes: laid } = await layoutDiagram(nodes, store.edges);
      store.pushHistory();
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
    if (!catalog) {
      setMigrationOpen(true);
      return;
    }
    const workspace = activeWorkspace(catalog);
    const baseline = readBaseline(baselineSlot(workspace.id, workspace.branch));
    setPreviousAST(baseline);
    setStatusMessage(
      baseline
        ? 'Showing migration diff against the saved baseline'
        : 'Showing the migration that creates the current schema',
    );
    setMigrationOpen(true);
  }, [catalog, setPreviousAST, setStatusMessage]);

  const openCatalog = useCallback((next: WorkspaceCatalog) => {
    writeCatalog(next);
    setCatalog(next);
    const workspace = activeWorkspace(next);
    const branch = activeBranch(workspace);
    setWorkspaceName(workspace.name);
    if (useDiagramStore.getState().rawText !== branch.rawText) {
      armAutoLayout();
      setRawText(branch.rawText);
    }
    setPreviousAST(readBaseline(baselineSlot(workspace.id, workspace.branch)));
  }, [armAutoLayout, setPreviousAST, setRawText]);

  const savedCatalog = useCallback(() => {
    if (!catalog) return null;
    return withActiveText(catalog, useDiagramStore.getState().rawText);
  }, [catalog]);

  const handleSelectWorkspace = useCallback(
    (id: string) => {
      const current = savedCatalog();
      if (!current) return;
      openCatalog(selectWorkspace(current, id));
    },
    [openCatalog, savedCatalog],
  );

  const handleRenameWorkspace = useCallback(
    (name: string) => {
      const current = savedCatalog();
      if (!current) return;
      openCatalog(renameActive(current, name));
    },
    [openCatalog, savedCatalog],
  );

  const handleCreateWorkspace = useCallback(() => {
    const current = savedCatalog();
    if (!current) return;
    openCatalog(addWorkspace(current, ''));
    setStatusMessage('New workspace');
  }, [openCatalog, savedCatalog, setStatusMessage]);

  const handleSelectBranch = useCallback(
    (name: string) => {
      const current = savedCatalog();
      if (!current) return;
      openCatalog(selectBranch(current, name));
    },
    [openCatalog, savedCatalog],
  );

  const handleCreateBranch = useCallback(
    (name: string) => {
      const current = savedCatalog();
      if (!current) return;
      const result = addBranch(current, name, useDiagramStore.getState().rawText);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      openCatalog(result.catalog);
      setStatusMessage(`Branch ${activeWorkspace(result.catalog).branch}`);
    },
    [openCatalog, savedCatalog, setStatusMessage],
  );

  const handleLoadSample = useCallback(
    (name: SampleName) => {
      confirmIf(workspaceHasContent(useDiagramStore.getState()), {
        title: 'Replace current schema?',
        description: `Load the ${name} sample and replace the current workspace. You can undo this.`,
        confirmLabel: 'Load sample',
        action: () => {
          useDiagramStore.getState().armAutoLayout();
          useDiagramStore.getState().replaceWorkspace({
            rawText: SAMPLE_SCHEMAS[name],
            origin: 'editor',
            statusMessage: `Loaded ${name} sample schema`,
          });
          const nextName = SAMPLE_WORKSPACES[name];
          setWorkspaceName(nextName);
          setCatalog((current) => {
            if (!current) return current;
            const next = renameActive(withActiveText(current, SAMPLE_SCHEMAS[name]), nextName);
            writeCatalog(next);
            return next;
          });
          setActiveView('split');
        },
      });
    },
    [],
  );

  const handleExport = useCallback((format: ExportFormat) => {
    const state = useDiagramStore.getState();
    try {
      toast.success(
        exportWorkspace(format, state.ast, nodePositions(state.nodes), workspaceName),
      );
    } catch {
      toast.error('Export failed');
    }
  }, [workspaceName]);

  const handleSave = useCallback(() => {
    const state = useDiagramStore.getState();
    saveWorkspace({
      workspaceVersion: 2,
      ast: state.ast,
      rawText: state.rawText,
      savedAt: Date.now(),
    });
    setStatusMessage('Schema saved locally');
  }, [setStatusMessage]);

  const handleClearSchema = useCallback(() => {
    confirmIf(workspaceHasContent(useDiagramStore.getState()), {
      title: 'Clear schema?',
      description: 'This removes every table and relationship. You can undo this.',
      confirmLabel: 'Clear schema',
      action: () => {
        useDiagramStore.getState().replaceWorkspace({
          ast: EMPTY_AST,
          rawText: '',
          origin: 'canvas',
          statusMessage: 'Schema cleared',
        });
        toast.success('Schema cleared');
      },
    });
  }, []);

  const handleSelectTable = useCallback(
    (name: string) => {
      setSelectedEdge(null);
      setSelectedTable(name);
      setInspectorOpen(true);
    },
    [setSelectedEdge, setSelectedTable],
  );

  const handleLeftToggle = useCallback(() => {
    setLeftCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(LEFT_PANEL_STORAGE_KEY, next ? 'collapsed' : 'expanded');
      return next;
    });
  }, []);

  const handleSettings = useCallback(() => {
    setLeftCollapsed(false);
    window.localStorage.setItem(LEFT_PANEL_STORAGE_KEY, 'expanded');
    setThemePickerOpen(true);
  }, []);

  const handleImport = useCallback(() => {
    document.getElementById('import-dbml')?.click();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
          target.isContentEditable);

      if (!isTyping && cmd && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        useDiagramStore.getState().undo();
        return;
      }
      if (
        !isTyping &&
        cmd &&
        (e.key.toLowerCase() === 'y' ||
          (e.key.toLowerCase() === 'z' && e.shiftKey))
      ) {
        e.preventDefault();
        useDiagramStore.getState().redo();
        return;
      }
      if (cmd && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (cmd && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
        return;
      }
      if (cmd && e.key === '0') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('jayvis:fit-view'));
        return;
      }
      if (cmd && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleAutoLayout();
        return;
      }
      if (cmd && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        setSqlBuilderOpen(true);
        return;
      }
      if (cmd && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setSqlBuilderOpen(true);
        return;
      }
      if (cmd && !e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleExport('dbml');
        return;
      }
      if (cmd && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleGenerateMigration();
        return;
      }
      if (cmd && !e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setAddTableOpen(true);
        return;
      }
      if (cmd && !e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleLeftToggle();
        return;
      }
      if (cmd && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setInspectorOpen((open) => !open);
        return;
      }
      if (cmd && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setValidationOpen(true);
        return;
      }
      if (cmd && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setThemePickerOpen(true);
        return;
      }
      if (cmd && e.key === ',') {
        e.preventDefault();
        handleSettings();
        return;
      }
      if (cmd && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setActiveView('erd');
        return;
      }
      if (cmd && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setActiveView('dbml');
        return;
      }
      if (cmd && e.key === '\\') {
        e.preventDefault();
        setActiveView('split');
        return;
      }
      if (cmd && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        setActiveView((['dbml', 'erd', 'split'] as CanvasView[])[Number(e.key) - 1]);
        return;
      }
      if (!isTyping && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setAddTableOpen(true);
        return;
      }
      if (!isTyping && (e.key === 'Delete' || e.key === 'Backspace') && selectedTable) {
        e.preventDefault();
        const tableName = selectedTable;
        confirmIf(true, {
          title: `Drop table ${tableName}?`,
          description: 'Related relationships will be removed. You can undo this.',
          confirmLabel: 'Drop table',
          action: () => {
            useDiagramStore.getState().deleteTable(tableName);
          },
        });
        return;
      }
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        setShortcutsOpen((current) => !current);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleAutoLayout, handleExport, handleGenerateMigration, handleLeftToggle, handleSave, handleSettings, selectedTable, setSelectedEdge, setSqlBuilderOpen, setSelectedTable]);

  useEffect(() => {
    return useDiagramStore.subscribe((state, prev) => {
      const pickedTable = state.selectedTable && state.selectedTable !== prev.selectedTable;
      const pickedEdge = state.selectedEdge && state.selectedEdge !== prev.selectedEdge;
      if (pickedTable || pickedEdge) setInspectorOpen(true);
    });
  }, []);

  useEffect(() => {
    const openInspector = () => setInspectorOpen(true);
    window.addEventListener('jayvis:open-inspector', openInspector);
    return () => window.removeEventListener('jayvis:open-inspector', openInspector);
  }, []);

  useEffect(() => {
    const addTableHandler = () => setAddTableOpen(true);
    const autoLayoutHandler = () => handleAutoLayout();
    const validateHandler = () => setValidationOpen(true);
    const tabHandler = () => {
      setLeftCollapsed(false);
    };
    const clearHandler = () => handleClearSchema();
    const retryParseHandler = () => {
      const store = useDiagramStore.getState();
      store.setRawText(store.rawText);
      setParseNonce((current) => current + 1);
    };
    window.addEventListener('jayvis:add-table', addTableHandler);
    window.addEventListener('jayvis:auto-layout', autoLayoutHandler);
    window.addEventListener('jayvis:validate', validateHandler);
    window.addEventListener('jayvis:tab', tabHandler);
    window.addEventListener('jayvis:clear-schema', clearHandler);
    window.addEventListener('jayvis:retry-parse', retryParseHandler);
    return () => {
      window.removeEventListener('jayvis:add-table', addTableHandler);
      window.removeEventListener('jayvis:auto-layout', autoLayoutHandler);
      window.removeEventListener('jayvis:validate', validateHandler);
      window.removeEventListener('jayvis:tab', tabHandler);
      window.removeEventListener('jayvis:clear-schema', clearHandler);
      window.removeEventListener('jayvis:retry-parse', retryParseHandler);
    };
  }, [handleAutoLayout, handleClearSchema]);

  const startResizeLeft = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    let lastWidth = leftWidth;
    const move = (moveEvent: PointerEvent) => {
      lastWidth = Math.min(320, Math.max(200, moveEvent.clientX - 32));
      setLeftWidth(lastWidth);
    };
    const up = () => {
      window.localStorage.setItem('jayvis-left-width', String(lastWidth));
      event.currentTarget.releasePointerCapture(event.pointerId);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startResizeRight = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    let lastWidth = rightWidth;
    const move = (moveEvent: PointerEvent) => {
      lastWidth = Math.min(460, Math.max(220, window.innerWidth - moveEvent.clientX));
      setRightWidth(lastWidth);
    };
    const up = () => {
      window.localStorage.setItem('jayvis-right-width', String(lastWidth));
      event.currentTarget.releasePointerCapture(event.pointerId);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const viewport = useViewportWidth();
  const fitted = fitWorkspace(viewport, {
    leftCollapsed,
    leftWidth,
    rightWidth,
    inspector: inspectorOpen,
    split: activeView === 'split',
  });

  const tableCount = Object.keys(ast.tables).length;
  const relationCount = Object.keys(ast.references).length;
  const migrationCount = useMemo(
    () => buildMigration(previousAST, ast).summary.up,
    [ast, previousAST],
  );

  const editorFrame = (
    <StagePane
      title="schema.dbml"
      onActivate={() => setActiveView(activeView === 'erd' ? 'split' : 'dbml')}
      onClose={activeView === 'split' ? () => setActiveView('erd') : undefined}
    >
      <div className="h-full bg-[var(--color-bg-editor)] text-[var(--color-text-primary)]">
        <CodeEditor
          value={rawText}
          onChange={setRawText}
          errorMessage={parseError}
          errorLine={parseErrorLine}
          wordWrap={settings.wordWrap}
          lineNumbers={settings.lineNumbers}
          fontSize={settings.fontSize}
          fontWeight={settings.fontWeight}
          fontLigatures={settings.fontLigatures}
        />
      </div>
    </StagePane>
  );

  const canvasFrame = (
    <StagePane
      title="ER Diagram"
      onActivate={() => setActiveView(activeView === 'dbml' ? 'split' : 'erd')}
      onClose={activeView === 'split' ? () => setActiveView('dbml') : undefined}
    >
      <div className="flex h-full flex-col bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)]">
        <div className="relative flex-1 overflow-hidden">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Mark name="loading" spin className="text-[var(--color-text-muted)]" />
              </div>
            }
          >
            <FlowCanvas />
          </Suspense>
        </div>
      </div>
    </StagePane>
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--color-bg-app)] font-sans">
      <Toolbar
        activeView={activeView}
        workspaceName={workspaceName}
        onAutoLayout={handleAutoLayout}
        onGenerateMigration={handleGenerateMigration}
        onMigrationOpenChange={setMigrationOpen}
        onSqlBuilderOpenChange={setSqlBuilderOpen}
        onClearSchema={handleClearSchema}
        onAddTableOpenChange={setAddTableOpen}
        onShortcutsOpenChange={setShortcutsOpen}
        onCommandPaletteOpenChange={setPaletteOpen}
        onExport={handleExport}
        onSave={handleSave}
        onToggleSidebar={handleLeftToggle}
        onActiveView={setActiveView}
        onSettings={handleSettings}
        onValidate={() => setValidationOpen(true)}
        onFind={() => {
          window.dispatchEvent(
            new Event(activeView === 'erd' ? 'jayvis:canvas-find' : 'jayvis:editor-find'),
          );
        }}
        onWorkspaceName={(name) => handleRenameWorkspace(name)}
        workspaces={(catalog ? catalog.workspaces : [{ id: 'current', name: workspaceName, branch: 'main', branches: [] }]).map(
          (workspace) => ({
            id: workspace.id,
            name: workspace.name,
            active: catalog ? workspace.id === catalog.activeId : true,
          }),
        )}
        branches={(catalog ? activeWorkspace(catalog).branches : [{ name: 'main', rawText: '', savedAt: 0 }]).map(
          (branch) => ({
            name: branch.name,
            active: catalog ? branch.name === activeWorkspace(catalog).branch : branch.name === 'main',
          }),
        )}
        onSelectWorkspace={handleSelectWorkspace}
        onRenameWorkspace={handleRenameWorkspace}
        onCreateWorkspace={handleCreateWorkspace}
        onSelectBranch={handleSelectBranch}
        onCreateBranch={handleCreateBranch}
        isLayouting={isLayouting}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className="flex h-full w-8 shrink-0 flex-col items-center border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-activity)] pt-1"
          aria-label="Explorer rail"
        >
          <button
            type="button"
            onClick={handleLeftToggle}
            className={`flex h-8 w-8 items-center justify-center ${
              leftCollapsed
                ? 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-primary)]'
            }`}
            aria-label="Toggle Schema Explorer"
            aria-pressed={!leftCollapsed}
          >
            <Mark name="table" />
          </button>
        </div>
        {fitted.showLeft && (
          <div
            className="relative h-full shrink-0"
            style={{ width: fitted.leftPx }}
          >
            <LeftPanel
              workspaceName={workspaceName}
              onToggle={handleLeftToggle}
              onSelectTable={handleSelectTable}
              onOpenSample={handleLoadSample}
              onImport={handleImport}
              onAddTable={() => setAddTableOpen(true)}
              onGenerateMigration={handleGenerateMigration}
            />
            <div
              onPointerDown={startResizeLeft}
              className="absolute -right-1 top-0 z-20 h-full w-2 cursor-col-resize bg-transparent hover:bg-[var(--color-accent-primary)]"
              aria-hidden="true"
            />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1">
            <div className="flex min-h-0 min-w-[280px] flex-1 flex-col">
              {activeView === 'split' ? (
                <ResizablePanelGroup direction="horizontal" className="h-full" autoSaveId="jayvis-editor-canvas">
                  <ResizablePanel defaultSize={selectedTable ? 30 : 38} minSize={22} maxSize={60} order={1}>
                    {editorFrame}
                  </ResizablePanel>
                  <ResizableHandle className="!w-px !bg-[var(--color-border-subtle)]" />
                  <ResizablePanel defaultSize={selectedTable ? 50 : 62} minSize={36} maxSize={72} order={2}>
                    {canvasFrame}
                  </ResizablePanel>
                </ResizablePanelGroup>
              ) : activeView === 'dbml' ? (
                <div className="h-full min-w-0">{editorFrame}</div>
              ) : (
                <div className="h-full min-w-0">{canvasFrame}</div>
              )}
            </div>

            {fitted.showRight && (
            <>
                <div
                  onPointerDown={startResizeRight}
                  className="relative z-10 h-full w-2 shrink-0 cursor-col-resize bg-transparent hover:bg-[var(--color-accent-primary)]"
                  aria-hidden="true"
                />
                <div
                  className="h-full shrink-0 border-l border-[var(--color-border-subtle)]"
                  style={{ width: fitted.rightPx }}
                >
                  <ContextPanel
                    onLoadSample={handleLoadSample}
                    onAddTable={() => setAddTableOpen(true)}
                    onImport={handleImport}
                    onClose={() => setInspectorOpen(false)}
                  />
                </div>
            </>
            )}
            {inspectorOpen && !fitted.showRight && (
              <div className="absolute inset-y-0 right-0 z-30 w-[min(100%,20rem)] border-l border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] shadow-sm">
                <ContextPanel
                  onLoadSample={handleLoadSample}
                  onAddTable={() => setAddTableOpen(true)}
                  onImport={handleImport}
                  onClose={() => setInspectorOpen(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <StatusBar
        syncStatus={syncStatus}
        isParsing={isParsing}
        parseError={parseError}
        statusMessage={statusMessage}
        validationErrors={validationErrors}
        validationWarnings={validationWarnings}
        tableCount={tableCount}
        relationCount={relationCount}
        showCursor={activeView !== 'erd'}
        problemCount={validationErrors + validationWarnings + (parseError ? 1 : 0)}
        migrationCount={migrationCount}
        onOpenProblems={() => setValidationOpen(true)}
        onOpenMigration={handleGenerateMigration}
        onOpenSql={() => setSqlBuilderOpen(true)}
        onRetryParse={() => {
          const store = useDiagramStore.getState();
          store.setRawText(store.rawText);
          setParseNonce((current) => current + 1);
        }}
      />

      <ThemePicker open={themePickerOpen} onOpenChange={setThemePickerOpen} />
      <MigrationPanel
        open={migrationOpen}
        onOpenChange={setMigrationOpen}
        slot={
          catalog
            ? baselineSlot(activeWorkspace(catalog).id, activeWorkspace(catalog).branch)
            : null
        }
      />
      <SqlBuilderPanel
        open={sqlBuilderOpen}
        onOpenChange={setSqlBuilderOpen}
        slot={
          catalog
            ? baselineSlot(activeWorkspace(catalog).id, activeWorkspace(catalog).branch)
            : null
        }
      />
      <ValidationPanel open={validationOpen} onOpenChange={setValidationOpen} />
      <AddTableDialog open={addTableOpen} onOpenChange={setAddTableOpen} />
      <ShortcutsOverlay open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onAutoLayout={() => void handleAutoLayout()}
        onGenerateMigration={handleGenerateMigration}
        onSqlBuilderOpenChange={setSqlBuilderOpen}
        onAddTableOpenChange={setAddTableOpen}
        onShortcutsOpenChange={setShortcutsOpen}
        onThemePickerOpenChange={setThemePickerOpen}
        onSettingsOpen={handleSettings}
        onLoadSample={handleLoadSample}
        onClearSchema={handleClearSchema}
        onValidationOpenChange={setValidationOpen}
        onExport={handleExport}
      />
      <ConfirmActionDialog />
    </div>
  );
}

function useViewportWidth() {
  const [width, setWidth] = useState(1440);
  useEffect(() => {
    const read = () => setWidth(window.innerWidth);
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);
  return width;
}

function fitWorkspace(
  viewport: number,
  panels: {
    leftCollapsed: boolean;
    leftWidth: number;
    rightWidth: number;
    inspector: boolean;
    split: boolean;
  },
) {
  const available = Math.max(0, viewport - 32);
  const stageMin = panels.split ? 640 : 420;
  let left = panels.leftCollapsed ? 0 : Math.min(panels.leftWidth, 320);
  let right = panels.inspector ? Math.min(panels.rightWidth, 360) : 0;
  let overflow = left + right + stageMin - available;
  if (overflow > 0 && right > 0) {
    const cut = Math.min(overflow, right);
    right -= cut;
    overflow -= cut;
  }
  if (overflow > 0 && left > 0) {
    const cut = Math.min(overflow, left);
    left -= cut;
  }
  return {
    showLeft: left >= 200,
    showRight: right >= 240,
    leftPx: left,
    rightPx: right,
  };
}

function StagePane({
  title,
  onActivate,
  onClose,
  children,
}: {
  title: string;
  onActivate: () => void;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const [tools, setTools] = useState(false);
  return (
    <div className="flex h-full min-w-0 flex-col">
      <div
        className="group flex h-8 shrink-0 items-center border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tabbar)] px-3"
        onMouseEnter={() => setTools(true)}
        onMouseLeave={() => setTools(false)}
        onFocus={() => setTools(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setTools(false);
        }}
      >
        <button
          type="button"
          onClick={onActivate}
          className="truncate font-mono text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          {title}
        </button>
        {onClose && tools && (
          <button
            type="button"
            onClick={onClose}
            className="ml-1 flex h-5 w-5 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            aria-label={`Close ${title}`}
          >
            <Mark name="close" />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
