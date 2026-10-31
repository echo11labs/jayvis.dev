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
import { EditorTabs } from '@/components/workspace/EditorTabs';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { useDiagramStore } from '@/store/diagram-store';
import { gridLayout, layoutDiagram, positionsCollapsed, warmupLayout } from '@/lib/layout/elk-layout';
import { baselineSlot, buildMigration, clearBaselineStorage, readBaseline, readBaselineMap } from '@/lib/migrations';
import { SAMPLE_SCHEMAS } from '@/lib/samples';
import { loadWorkspace, openStudio, readStudio, saveWorkspace } from '@/lib/persistence';
import { FileManagerModal } from '@/components/workspace/FileManagerModal';
import { parseImportedFile } from '@/lib/ast-schema';
import { sanitizeDbmlText, serializeDBML } from '@/lib/parser/dbml';
import {
  activeBranch,
  activeFile,
  activeWorkspace,
  addBranch,
  addFile,
  addWorkspace,
  branchFiles,
  branchOpenFiles,
  clearCatalogStorage,
  closeFileTab,
  createCatalog,
  MAX_FILES_PER_USER,
  readCatalog,
  removeFile,
  renameActive,
  renameFile,
  selectBranch,
  selectFile,
  selectWorkspace,
  withActiveText,
  writeCatalog,
  type WorkspaceCatalog,
  type WorkspaceFile,
} from '@/lib/workspaces';
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
import { useAuthContext } from '@/components/auth/AuthProvider';
import { pushCatalogToCloud } from '@/lib/cloud-sync';
import { detectDialect } from '@/lib/editor/code-formatter';

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

export function StudioApp() {
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
  const [sqlBuilderTab, setSqlBuilderTab] = useState<string>('preview');

  const handleOpenSqlBuilder = useCallback((open: boolean, tab = 'preview') => {
    if (open) {
      setSqlBuilderTab(tab);
    }
    setSqlBuilderOpen(open);
  }, []);
  const [fileManagerOpen, setFileManagerOpen] = useState(false);
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
  const { maxFiles: authMaxFiles, tier, isSignedIn } = useAuthContext();
  const effectiveMaxFiles = authMaxFiles ?? MAX_FILES_PER_USER;
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const viewParam = params?.get('view');
    if (viewParam === 'board' || viewParam === 'erd') {
      setActiveView('erd');
    } else if (viewParam === 'code' || viewParam === 'dbml') {
      setActiveView('dbml');
    } else if (viewParam === 'split' || viewParam === 'both') {
      setActiveView('split');
    }

    const panelParam = params?.get('panel');
    if (panelParam === 'sql') setSqlBuilderOpen(true);
    if (panelParam === 'migration') setMigrationOpen(true);
    if (panelParam === 'palette') setPaletteOpen(true);
    if (panelParam === 'validation') setValidationOpen(true);

    if (params?.get('inspector') === '0' || params?.get('inspector') === 'false') {
      setInspectorOpen(false);
    }
    const isLeftCollapsed =
      (window.localStorage.getItem(LEFT_PANEL_STORAGE_KEY) ??
        window.localStorage.getItem('stitchdb-left-panel')) === 'collapsed' || params?.get('left') === 'collapsed';
    setLeftCollapsed(isLeftCollapsed);
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

        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const sampleParam = (params?.get('sample') as SampleName | null) || null;
        const requestedSample = sampleParam && SAMPLE_SCHEMAS[sampleParam] ? SAMPLE_SCHEMAS[sampleParam] : null;

        const seededText = requestedSample ?? (persisted?.rawText?.trim()
          ? sanitizeDbmlText(persisted.rawText)
          : DEFAULT_DBML);
        const seededName = inferWorkspaceName(
          seededText,
          sampleParam ? SAMPLE_WORKSPACES[sampleParam] : (window.localStorage.getItem(WORKSPACE_NAME_KEY) || 'ecommerce-db'),
        );
        let nextCatalog = requestedSample ? createCatalog(seededName, seededText) : (studio?.catalog ?? readCatalog());
        if (!nextCatalog) nextCatalog = createCatalog(seededName, seededText);
        if (!studio || requestedSample) {
          await openStudio({
            fileVersion: 1,
            snapshot: {
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

        const targetText = requestedSample ?? (branch.rawText?.trim() ? branch.rawText : DEFAULT_DBML);
        if (!requestedSample && persisted && branch.rawText === sanitizeDbmlText(persisted.rawText) && persisted.ast && Object.keys(persisted.ast.tables || {}).length > 0) {
          hydrateWorkspace(persisted.ast, branch.rawText);
        } else {
          armAutoLayout();
          setRawText(targetText);
        }
        setStatusMessage(
          persisted && !requestedSample ? 'Restored saved workspace' : `Opened ${workspace.name}`,
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
          const store = useDiagramStore.getState();
          const existingNodeMap = new Map(store.nodes.map((n) => [n.id, n]));
          const existingCount = store.nodes.length;
          const matchingCount = nextNodes.filter((n) => existingNodeMap.has(n.id)).length;

          // Automatically apply auto layout if:
          // 1. Explicitly requested (layoutOnNextParse)
          // 2. Initial schema load or empty canvas (existingCount === 0)
          // 3. Current nodes are collapsed or sharing positions
          // 4. A fresh or largely replaced schema was parsed (matching fewer than 40% of tables)
          const isFreshSchema =
            existingCount === 0 ||
            matchingCount < Math.min(3, Math.ceil(nextNodes.length * 0.4));
          const isCollapsed = positionsCollapsed(store.nodes);
          const shouldAutoLayout =
            store.layoutOnNextParse ||
            isFreshSchema ||
            isCollapsed;

          if (
            shouldAutoLayout &&
            nextNodes.length > 1 &&
            store.parseGeneration === generation
          ) {
            try {
              const laid = await layoutDiagram(nextNodes, result.edges as any, {
                groupByDomain: settings.groupByDomain,
                tableGroups: result.ast.tableGroups,
              });
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
            { replacePositions: shouldAutoLayout && nextNodes.length > 1 },
          );
          if (shouldAutoLayout) {
            useDiagramStore.setState({ layoutOnNextParse: false });
          }
          if (shouldAutoLayout && nextNodes.length > 1) {
            window.setTimeout(() => {
              window.dispatchEvent(new Event('jayvis:fit-view'));
            }, 120);
          }
          setParseErrorLine(null);
          setStatusMessage(
            shouldAutoLayout
              ? `Auto layout applied (${Object.keys(result.ast.tables).length} tables)`
              : `Parsed ${Object.keys(result.ast.tables).length} table(s)`,
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
      setCatalog((current) => {
        const next = current ? withActiveText(current, rawText) : current;
        if (next && next !== current) {
          writeCatalog(next);
        }
        void saveWorkspace(
          {
            workspaceVersion: 2,
            ast: persistable,
            rawText,
            savedAt: Date.now(),
          },
          next ?? undefined,
        );
        return next;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [hydrated, ast, nodes, rawText, settings.autoSave]);

  const handleAutoLayout = useCallback(
    async (optionsOverride?: {
      groupByDomain?: boolean;
      direction?: 'RIGHT' | 'LEFT' | 'DOWN' | 'UP';
      algorithm?: 'layered' | 'grid';
    }) => {
      const currentNodes = useDiagramStore.getState().nodes;
      if (currentNodes.length === 0) {
        toast.info('No tables to layout');
        return;
      }
      if (activeView === 'dbml') {
        setActiveView('split');
      }
      setIsLayouting(true);
      try {
        const store = useDiagramStore.getState();
        const groupByDomain =
          optionsOverride?.groupByDomain !== undefined
            ? optionsOverride.groupByDomain
            : settings.groupByDomain;
        const direction = optionsOverride?.direction ?? 'RIGHT';
        const algorithm = optionsOverride?.algorithm ?? 'layered';

        if (algorithm === 'grid') {
          const grid = gridLayout(currentNodes);
          store.pushHistory();
          setNodes(grid);
          setStatusMessage('Grid layout applied');
          toast.success('Grid layout applied');
        } else {
          const { nodes: laid } = await layoutDiagram(currentNodes, store.edges, {
            direction,
            algorithm,
            groupByDomain,
            tableGroups: ast.tableGroups,
          });
          store.pushHistory();
          setNodes(laid);
          const hasGroups = groupByDomain && Object.keys(ast.tableGroups ?? {}).length > 0;
          const msg = hasGroups
            ? 'Grouped domain layout applied'
            : direction === 'DOWN'
              ? 'Vertical layout applied'
              : 'Auto layout applied';
          setStatusMessage(msg);
          toast.success(msg);
        }
        window.setTimeout(() => {
          window.dispatchEvent(new Event('jayvis:fit-view'));
        }, 100);
      } catch (err) {
        console.error('ELK layout failed:', err);
        const grid = gridLayout(currentNodes);
        useDiagramStore.getState().setNodes(grid);
        setStatusMessage('Grid layout fallback applied');
        toast.info('Grid layout applied (fallback)');
      } finally {
        setIsLayouting(false);
      }
    },
    [activeView, ast.tableGroups, setActiveView, setNodes, setStatusMessage, settings.groupByDomain],
  );

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

  const currentWorkspaceRecord = catalog ? activeWorkspace(catalog) : null;
  const currentBranchRecord = currentWorkspaceRecord ? activeBranch(currentWorkspaceRecord) : null;
  const currentFiles = currentBranchRecord ? branchFiles(currentBranchRecord) : [];
  const openTabs = currentBranchRecord ? branchOpenFiles(currentBranchRecord) : [];
  const currentActiveFile = currentBranchRecord ? activeFile(currentBranchRecord) : null;
  const activeFileId = currentActiveFile?.id ?? currentFiles[0]?.id;

  const handleSelectFile = useCallback(
    (fileId: string) => {
      const current = savedCatalog();
      if (!current) return;
      openCatalog(selectFile(current, fileId));
    },
    [openCatalog, savedCatalog],
  );

  const handleCloseTab = useCallback(
    (fileId: string) => {
      const current = savedCatalog();
      if (!current) return;
      const next = closeFileTab(current, fileId);
      openCatalog(next);
    },
    [openCatalog, savedCatalog],
  );

  const handleAddFile = useCallback(() => {
    setFileManagerOpen(true);
  }, []);

  const handleCreateFile = useCallback(
    (name: string, content = '') => {
      const current = savedCatalog();
      if (!current) return;
      const workspace = activeWorkspace(current);
      const branch = activeBranch(workspace);
      const files = branchFiles(branch);
      if (files.length >= effectiveMaxFiles) {
        toast.error(
          `Maximum ${effectiveMaxFiles} files limit reached for ${tier} tier. Please delete a file first or upgrade.`,
        );
        return;
      }
      const result = addFile(current, name, content, Date.now(), effectiveMaxFiles);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      openCatalog(result.catalog);
      toast.success(`Created ${result.file?.name}`);
    },
    [openCatalog, savedCatalog, effectiveMaxFiles, tier],
  );

  const handleRemoveFile = useCallback(
    (fileId: string) => {
      const current = savedCatalog();
      if (!current) return;
      const workspace = activeWorkspace(current);
      const branch = activeBranch(workspace);
      const files = branchFiles(branch);
      const target = files.find((f) => f.id === fileId);
      if (!target) return;
      if (files.length <= 1) {
        toast.error('Cannot delete the only file in the workspace');
        return;
      }
      confirmIf(true, {
        title: `Delete ${target.name}?`,
        description: `Are you sure you want to delete ${target.name}? This action cannot be undone.`,
        confirmLabel: 'Delete',
        action: () => {
          const result = removeFile(current, fileId);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          openCatalog(result.catalog);
          toast.success(`Deleted ${target.name}`);
        },
      });
    },
    [openCatalog, savedCatalog],
  );

  const handleRenameFile = useCallback(
    (fileId: string, newName: string) => {
      const current = savedCatalog();
      if (!current) return;
      const result = renameFile(current, fileId, newName);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      openCatalog(result.catalog);
      toast.success('Renamed file');
    },
    [openCatalog, savedCatalog],
  );

  const handleImportFileContent = useCallback(
    async (fileName: string, content: string) => {
      const current = savedCatalog();
      if (!current) return;
      const workspace = activeWorkspace(current);
      const branch = activeBranch(workspace);
      const files = branchFiles(branch);

      let processedContent = content;
      let targetFileName = fileName;

      // 1. If SQL file or contains SQL CREATE TABLE
      const isSql =
        fileName.toLowerCase().endsWith('.sql') ||
        /^\s*CREATE\s+TABLE/i.test(content.trim());

      if (isSql) {
        try {
          const res = await fetch('/api/import-sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: content }),
          });
          const data = await res.json();
          if (data.ok && data.dbml) {
            processedContent = data.dbml;
            targetFileName = fileName.replace(/\.sql$/i, '.dbml');
            if (!targetFileName.endsWith('.dbml')) {
              targetFileName += '.dbml';
            }
            toast.success(`Converted ${fileName} SQL to DBML`);
          }
        } catch {
          // Fall back to original content if conversion fails
        }
      } else {
        // 2. Check JSON / AST
        const parsed = parseImportedFile(fileName, content);
        if (parsed.kind === 'ast') {
          processedContent = serializeDBML(parsed.ast);
          targetFileName = fileName.replace(/\.json$/i, '.dbml');
          if (!targetFileName.endsWith('.dbml')) targetFileName += '.dbml';
        } else if (parsed.kind === 'dbml') {
          processedContent = parsed.rawText;
        }
      }

      if (files.length < effectiveMaxFiles) {
        const result = addFile(current, targetFileName, processedContent, Date.now(), effectiveMaxFiles);
        if (!result.error) {
          openCatalog(result.catalog);
          toast.success(`Imported ${result.file?.name}`);
          return;
        }
      }

      confirmIf(true, {
        title: 'Replace active file?',
        description: `You have reached the ${effectiveMaxFiles}-file limit for your ${tier} tier. Replace active file with ${targetFileName}?`,
        confirmLabel: 'Replace file',
        action: () => {
          renameFile(current, activeFile(branch).id, targetFileName);
          useDiagramStore.getState().armAutoLayout();
          useDiagramStore.getState().replaceWorkspace({
            rawText: processedContent,
            origin: 'editor',
            statusMessage: `Imported ${targetFileName}`,
          });
          toast.success(`Imported ${targetFileName}`);
        },
      });
    },
    [openCatalog, savedCatalog],
  );

  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingFile(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  }, []);

  const handleDropFile = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFile(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = typeof event.target?.result === 'string' ? event.target.result : '';
        handleImportFileContent(file.name, content);
      };
      reader.readAsText(file);
    },
    [handleImportFileContent],
  );

  const handleOpenNativeFile = useCallback(async () => {
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'Schema Files (*.dbml, *.sql, *.json)',
              accept: {
                'text/plain': ['.dbml', '.sql', '.json', '.txt'],
              },
            },
          ],
        });
        const file = await handle.getFile();
        const content = await file.text();
        handleImportFileContent(file.name, content);
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    document.getElementById('import-dbml')?.click();
  }, [handleImportFileContent]);

  const handleCloudSync = useCallback(async () => {
    const current = savedCatalog();
    if (!current) return;
    setIsSyncing(true);
    try {
      const res = await pushCatalogToCloud(current);
      if (res.ok) {
        toast.success('Workspaces synced to Cloud Storage');
        setStatusMessage('Synced with Cloud');
      } else if (res.error === 'QUOTA_EXCEEDED') {
        toast.error(res.message || 'File quota exceeded for your tier');
      } else {
        toast.error(res.message || 'Cloud sync failed');
      }
    } catch {
      toast.error('Failed to sync to cloud');
    } finally {
      setIsSyncing(false);
    }
  }, [savedCatalog, setStatusMessage]);

  const handleSave = useCallback(async () => {
    const state = useDiagramStore.getState();
    const currentCat = catalog ? withActiveText(catalog, state.rawText) : null;
    if (currentCat) {
      writeCatalog(currentCat);
    }
    await saveWorkspace(
      {
        workspaceVersion: 2,
        ast: state.ast,
        rawText: state.rawText,
        savedAt: Date.now(),
      },
      currentCat ?? undefined,
    );
    setStatusMessage('Schema saved locally');
    toast.success('Saved schema');

    if (isSignedIn && currentCat) {
      void pushCatalogToCloud(currentCat).then((res) => {
        if (res.ok) {
          setStatusMessage('Synced to Cloud Storage');
        } else if (res.error === 'QUOTA_EXCEEDED') {
          toast.error(res.message);
        }
      });
    }
  }, [catalog, setStatusMessage, isSignedIn]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const current = savedCatalog();
      if (current) {
        writeCatalog(current);
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [savedCatalog]);

  const handleSaveNativeFile = useCallback(async () => {
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const currentName = currentActiveFile?.name ?? 'schema.dbml';
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: currentName,
          types: [
            {
              description: 'DBML Schema',
              accept: { 'text/plain': ['.dbml'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(rawText);
        await writable.close();
        toast.success(`Saved ${currentName} to disk`);
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    handleSave();
  }, [currentActiveFile, handleSave, rawText]);

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
    void handleOpenNativeFile();
  }, [handleOpenNativeFile]);

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
      if (cmd && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleAddFile();
        return;
      }
      if (cmd && !e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        void handleOpenNativeFile();
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
      if (cmd && !e.shiftKey && (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'u')) {
        e.preventDefault();
        setFileManagerOpen(true);
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
      if ((e.altKey && e.shiftKey && e.key.toLowerCase() === 'f') || (cmd && e.altKey && e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        window.dispatchEvent(new Event('jayvis:editor-format'));
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
  const migrationCount = useMemo(() => {
    try {
      return buildMigration(previousAST, ast).summary.up;
    } catch {
      return 0;
    }
  }, [ast, previousAST]);

  const editorFrame = (
    <div
      className="relative flex h-full min-w-0 flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropFile}
    >
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--color-accent-primary)] bg-[var(--color-bg-app)]/85 backdrop-blur-sm pointer-events-none">
          <Mark name="upload" className="h-8 w-8 text-[var(--color-accent-primary)]" />
          <p className="font-mono text-xs text-[var(--color-text-primary)]">
            Drop schema file to import (max {effectiveMaxFiles} files - {tier} tier)
          </p>
        </div>
      )}
      <EditorTabs
        files={openTabs}
        activeFileId={activeFileId}
        maxFiles={effectiveMaxFiles}
        onSelectFile={handleSelectFile}
        onAddFile={handleAddFile}
        onCloseTab={handleCloseTab}
        onRenameFile={handleRenameFile}
        onClose={activeView === 'split' ? () => setActiveView('erd') : undefined}
      />
      <div className="min-h-0 flex-1 bg-[var(--color-bg-editor)] text-[var(--color-text-primary)]">
        <CodeEditor
          value={rawText}
          onChange={setRawText}
          fileName={currentActiveFile?.name}
          errorMessage={parseError}
          errorLine={parseErrorLine}
          wordWrap={settings.wordWrap}
          lineNumbers={settings.lineNumbers}
          fontSize={settings.fontSize}
          fontWeight={settings.fontWeight}
          fontLigatures={settings.fontLigatures}
        />
      </div>
    </div>
  );

  const canvasFrame = (
    <StagePane
      title="ER Diagram"
      onActivate={() => setActiveView(activeView === 'dbml' ? 'split' : 'erd')}
      onClose={activeView === 'split' ? () => setActiveView('dbml') : undefined}
    >
      <div
        className="relative flex h-full flex-col bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)]"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropFile}
      >
        {isDraggingFile && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--color-accent-primary)] bg-[var(--color-bg-app)]/85 backdrop-blur-sm pointer-events-none">
            <Mark name="upload" className="h-8 w-8 text-[var(--color-accent-primary)]" />
            <p className="font-mono text-xs text-[var(--color-text-primary)]">
              Drop schema file to import (max {effectiveMaxFiles} files - {tier} tier)
            </p>
          </div>
        )}
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
        onSqlBuilderOpenChange={handleOpenSqlBuilder}
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
        onCloudSync={handleCloudSync}
        isSyncing={isSyncing}
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
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full flex-1"
          autoSaveId="jayvis-workspace-layout"
        >
          {fitted.showLeft && (
            <>
              <ResizablePanel
                id="schema-explorer"
                order={1}
                defaultSize={18}
                minSize={12}
                maxSize={32}
              >
                <div className="relative h-full overflow-hidden">
                  <LeftPanel
                    workspaceName={workspaceName}
                    files={currentFiles}
                    activeFileId={activeFileId}
                    onToggle={handleLeftToggle}
                    onSelectTable={handleSelectTable}
                    onOpenSample={handleLoadSample}
                    onImport={handleImport}
                    onAddTable={() => setAddTableOpen(true)}
                    onGenerateMigration={handleGenerateMigration}
                    onAutoLayout={handleAutoLayout}
                    onSelectFile={handleSelectFile}
                    onAddFile={handleAddFile}
                    onRemoveFile={handleRemoveFile}
                    onRenameFile={handleRenameFile}
                  />
                </div>
              </ResizablePanel>
              <ResizableHandle />
            </>
          )}

          <ResizablePanel id="workspace-stage" order={2} minSize={30}>
            <div className="flex h-full min-w-0 flex-1 flex-col">
              <div className="relative flex h-full min-h-0 flex-1">
                <div className="flex h-full min-h-0 min-w-[280px] flex-1 flex-col">
                  {activeView === 'split' ? (
                    <ResizablePanelGroup direction="horizontal" className="h-full" autoSaveId="jayvis-editor-canvas">
                      <ResizablePanel defaultSize={selectedTable ? 30 : 38} minSize={22} maxSize={60} order={1}>
                        {editorFrame}
                      </ResizablePanel>
                      <ResizableHandle />
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
              </div>
            </div>
          </ResizablePanel>

          {fitted.showRight && (
            <>
              <ResizableHandle />
              <ResizablePanel
                id="task-inspector"
                order={3}
                defaultSize={22}
                minSize={15}
                maxSize={36}
              >
                <div className="h-full overflow-hidden">
                  <ContextPanel
                    onLoadSample={handleLoadSample}
                    onAddTable={() => setAddTableOpen(true)}
                    onImport={handleImport}
                    onClose={() => setInspectorOpen(false)}
                  />
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

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
        dialect={detectDialect(currentActiveFile?.name, currentActiveFile?.rawText)}
        onFormat={() => window.dispatchEvent(new Event('jayvis:editor-format'))}
        problemCount={validationErrors + validationWarnings + (parseError ? 1 : 0)}
        migrationCount={migrationCount}
        onOpenProblems={() => setValidationOpen(true)}
        onOpenMigration={handleGenerateMigration}
        onOpenSql={() => handleOpenSqlBuilder(true, 'preview')}
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
        initialTab={sqlBuilderTab}
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
        onSqlBuilderOpenChange={handleOpenSqlBuilder}
        onFormatDocument={() => window.dispatchEvent(new Event('jayvis:editor-format'))}
        onAddTableOpenChange={setAddTableOpen}
        onShortcutsOpenChange={setShortcutsOpen}
        onThemePickerOpenChange={setThemePickerOpen}
        onSettingsOpen={handleSettings}
        onLoadSample={handleLoadSample}
        onClearSchema={handleClearSchema}
        onValidationOpenChange={setValidationOpen}
        onExport={handleExport}
        onAddFile={handleAddFile}
        onManageFiles={() => setFileManagerOpen(true)}
        onOpenDisk={() => void handleOpenNativeFile()}
        onSaveDisk={() => void handleSaveNativeFile()}
      />
      <FileManagerModal
        open={fileManagerOpen}
        onOpenChange={setFileManagerOpen}
        files={currentFiles}
        activeFileId={activeFileId}
        openFileIds={currentBranchRecord?.openFileIds ?? []}
        maxFiles={effectiveMaxFiles}
        onCreateFile={handleCreateFile}
        onSelectFile={handleSelectFile}
        onCloseTab={handleCloseTab}
        onRenameFile={handleRenameFile}
        onDeleteFile={handleRemoveFile}
        onImportFileContent={handleImportFileContent}
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
