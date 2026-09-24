'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDiagramStore } from '@/store/diagram-store';
import { serializeDBML } from '@/lib/parser/dbml';
import { toast } from 'sonner';
import { parseImportedFile } from '@/lib/ast-schema';
import { layoutFreshNodes } from '@/lib/layout/elk-layout';
import { confirmIf } from '@/lib/confirm-action';
import { workspaceHasContent } from '@/store/diagram-store';
import type { ExportFormat } from '@/lib/export/workspace';
import { summarizeValidation } from '@/lib/validation/schema-validation';
import { Mark, type MarkName } from '@/lib/ui/marks';
import { useEffect, useMemo, useState } from 'react';

export type SampleName = 'ecommerce' | 'blog' | 'saas' | 'auth' | 'analytics';
export type { ExportFormat };
export type CanvasView = 'split' | 'dbml' | 'erd';

interface ToolbarProps {
  activeView: CanvasView;
  workspaceName: string;
  onAutoLayout: () => Promise<void>;
  onGenerateMigration: () => void;
  onMigrationOpenChange: (open: boolean) => void;
  onSqlBuilderOpenChange: (open: boolean) => void;
  onClearSchema: () => void;
  onAddTableOpenChange: (open: boolean) => void;
  onShortcutsOpenChange: (open: boolean) => void;
  onCommandPaletteOpenChange: (open: boolean) => void;
  onExport: (format: ExportFormat) => void;
  onSave: () => void;
  onToggleSidebar: () => void;
  onActiveView: (view: CanvasView) => void;
  onSettings: () => void;
  onValidate: () => void;
  onWorkspaceName?: (name: string) => void;
  workspaces: Array<{ id: string; name: string; active: boolean }>;
  branches: Array<{ name: string; active: boolean }>;
  onSelectWorkspace: (id: string) => void;
  onRenameWorkspace: (name: string) => void;
  onCreateWorkspace: () => void;
  onSelectBranch: (name: string) => void;
  onCreateBranch: (name: string) => void;
  isLayouting: boolean;
}

const menuCls =
  'min-w-[12rem] border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] text-[var(--color-text-primary)]';
const itemCls =
  'cursor-pointer text-[12px] text-[var(--color-text-primary)] focus:bg-[var(--color-selection)] focus:text-[var(--color-text-primary)]';

const MODES: Array<{ id: CanvasView; label: string; icon: MarkName }> = [
  { id: 'dbml', label: 'Code', icon: 'code' },
  { id: 'erd', label: 'Board', icon: 'layout' },
  { id: 'split', label: 'Both', icon: 'split' },
];

export function Toolbar({
  activeView,
  workspaceName,
  onAutoLayout,
  onGenerateMigration,
  onMigrationOpenChange,
  onSqlBuilderOpenChange,
  onClearSchema,
  onAddTableOpenChange,
  onShortcutsOpenChange,
  onCommandPaletteOpenChange,
  onExport,
  onSave,
  onToggleSidebar,
  onActiveView,
  onSettings,
  onValidate,
  onWorkspaceName,
  workspaces,
  branches,
  onSelectWorkspace,
  onRenameWorkspace,
  onCreateWorkspace,
  onSelectBranch,
  onCreateBranch,
  isLayouting,
}: ToolbarProps) {
  const tableCount = useDiagramStore((s) => Object.keys(s.ast.tables).length);
  const ast = useDiagramStore((s) => s.ast);
  const canUndo = useDiagramStore((s) => s.undoStack.length > 0);
  const canRedo = useDiagramStore((s) => s.redoStack.length > 0);
  const undo = useDiagramStore((s) => s.undo);
  const redo = useDiagramStore((s) => s.redo);
  const { errors, warnings } = useMemo(() => summarizeValidation(ast), [ast]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const empty = mounted && tableCount === 0;

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(ast, null, 2));
      toast.success('Copied AST JSON to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleCopyDbml = async () => {
    try {
      await navigator.clipboard.writeText(serializeDBML(ast));
      toast.success('Copied DBML to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '');
      const parsed = parseImportedFile(file.name, text);
      if (parsed.kind === 'error') {
        toast.error(parsed.error);
        return;
      }
      const apply = () => {
        void (async () => {
          if (parsed.kind === 'ast') {
            const nodes = Object.values(parsed.ast.tables).map((table) => ({
              id: table.name,
              type: 'table',
              position: table.position ?? { x: 0, y: 0 },
              data: { table },
            }));
            const edges = Object.values(parsed.ast.references).map((ref) => ({
              id: ref.id,
              source: ref.sourceTable,
              target: ref.targetTable,
            }));
            const laid = await layoutFreshNodes(nodes, edges);
            const tables = { ...parsed.ast.tables };
            for (const node of laid) {
              const table = tables[node.id];
              if (table) tables[node.id] = { ...table, position: node.position };
            }
            useDiagramStore.getState().replaceWorkspace({
              ast: { ...parsed.ast, tables },
              nodes: laid,
              origin: 'canvas',
              statusMessage: `Imported AST from ${file.name}`,
            });
            window.setTimeout(() => {
              window.dispatchEvent(new Event('jayvis:fit-view'));
            }, 120);
            toast.success(`Imported AST from ${file.name}`);
            onWorkspaceName?.(file.name.replace(/\.[^.]+$/, '') || 'workspace');
            return;
          }
          useDiagramStore.getState().armAutoLayout();
          useDiagramStore.getState().replaceWorkspace({
            rawText: parsed.rawText,
            origin: 'editor',
            statusMessage: `Imported ${file.name}`,
          });
          toast.success(`Imported ${file.name}`);
          onWorkspaceName?.(file.name.replace(/\.[^.]+$/, '') || 'workspace');
        })();
      };
      confirmIf(workspaceHasContent(useDiagramStore.getState()), {
        title: 'Replace current schema?',
        description: `Import ${file.name} and replace the current workspace. You can undo this.`,
        confirmLabel: 'Import',
        action: apply,
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header
      suppressHydrationWarning
      className="relative flex h-11 shrink-0 items-center border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-titlebar)] px-3 text-[12px]"
    >
      <input
        id="import-dbml"
        type="file"
        accept=".dbml,.txt,.json"
        className="hidden"
        onChange={handleImport}
      />
      <div role="group" aria-label="Workspace" className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex shrink-0 items-center gap-2 font-medium tracking-tight text-[var(--color-text-primary)]"
          title="Toggle Schema Explorer"
        >
          <span className="h-2 w-2 rounded-full bg-[var(--color-accent-primary)]" />
          JayVis.dev
          <span className="select-none text-[var(--color-text-muted)]"> ·</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              suppressHydrationWarning
              className="flex h-7 max-w-[9rem] items-center gap-1 truncate rounded-md px-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
              title={workspaceName}
              aria-label={`${workspaceName} ·`}
            >
              <span className="truncate">{workspaceName}</span>
              <span className="select-none text-[var(--color-text-muted)]"> ·</span>
              <Mark name="chevronDown" className="shrink-0 text-[var(--color-text-muted)]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={menuCls}>
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                className={itemCls}
                onClick={() => onSelectWorkspace(workspace.id)}
              >
                <span className="truncate">{workspace.name}</span>
                {workspace.active && <Mark name="check" className="ml-auto shrink-0" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-[var(--color-border-subtle)]" />
            <div className="px-2 py-1.5" onKeyDown={(event) => event.stopPropagation()}>
              <input
                key={workspaceName}
                aria-label="Rename workspace"
                defaultValue={workspaceName}
                className="h-7 w-full rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-2 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)]"
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === 'Enter') onRenameWorkspace(event.currentTarget.value);
                }}
                onBlur={(event) => {
                  const next = event.target.value.trim();
                  if (next && next !== workspaceName) onRenameWorkspace(next);
                }}
              />
            </div>
            <DropdownMenuItem className={itemCls} onClick={onCreateWorkspace}>
              New workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-7 items-center gap-1.5 rounded-md px-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
              aria-label={`${branches.find((branch) => branch.active)?.name ?? 'main'} ·`}
            >
              <BranchMark />
              <span>{branches.find((branch) => branch.active)?.name ?? 'main'}</span>
              <span className="select-none text-[var(--color-text-muted)]"> ·</span>
              <Mark name="chevronDown" className="text-[var(--color-text-muted)]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={menuCls}>
            {branches.map((branch) => (
              <DropdownMenuItem
                key={branch.name}
                className={itemCls}
                onClick={() => onSelectBranch(branch.name)}
              >
                <span className="truncate">{branch.name}</span>
                {branch.active && <Mark name="check" className="ml-auto shrink-0" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-[var(--color-border-subtle)]" />
            <div className="px-2 py-1.5" onKeyDown={(event) => event.stopPropagation()}>
              <input
                aria-label="New branch"
                placeholder="New branch"
                className="h-7 w-full rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-2 text-[12px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)]"
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key !== 'Enter') return;
                  const name = event.currentTarget.value;
                  onCreateBranch(name);
                  event.currentTarget.value = '';
                }}
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <span className="select-none px-2 text-[var(--color-text-muted)]">·</span>

      <div
        role="group"
        aria-label="View"
        className="absolute left-1/2 flex h-11 -translate-x-1/2 items-stretch"
      >
        {MODES.map((mode) => {
          const active = activeView === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onActiveView(mode.id)}
              className={`flex items-center gap-1.5 border-b-2 px-3 text-[12px] ${
                active
                  ? 'border-[var(--color-accent-primary)] text-[var(--color-text-primary)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Mark name={mode.icon} className={active ? 'text-[var(--color-accent-primary)]' : undefined} />
              {mode.label}
              <span className="select-none text-[var(--color-text-muted)]"> ·</span>
            </button>
          );
        })}
      </div>

      <div role="group" aria-label="Commands" className="ml-auto flex items-center gap-0.5 border-l border-[var(--color-border-default)] pl-2">
        <span className="select-none px-1 text-[var(--color-text-muted)]">·</span>
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          aria-label="Undo ·"
          title="Undo (⌘Z)"
          className="flex h-7 w-7 items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] disabled:opacity-30"
        >
          <Mark name="undo" />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          aria-label="Redo ·"
          title="Redo (⌘⇧Z)"
          className="flex h-7 w-7 items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] disabled:opacity-30"
        >
          <Mark name="redo" />
        </button>
        <StripButton
          icon="search"
          label="Find"
          shortcut="⌘F"
          title="Find"
          onClick={() => window.dispatchEvent(new Event('jayvis:editor-find'))}
        />
        <StripButton
          icon="shield"
          label="Validate"
          shortcut="⌘⇧V"
          title="Validate"
          tone={errors > 0 ? 'danger' : warnings > 0 ? 'warning' : undefined}
          onClick={onValidate}
        />
        <StripButton
          icon="diff"
          label="Migration"
          shortcut="⌘M"
          title="Migration"
          disabled={empty}
          onClick={() => {
            onGenerateMigration();
            onMigrationOpenChange(true);
          }}
        />
        <StripButton
          icon="database"
          label="SQL"
          shortcut="⌘⇧S"
          title="Build SQL"
          disabled={empty}
          onClick={() => onSqlBuilderOpenChange(true)}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
              title="Export"
            >
              <Mark name="download" />
              Export
              <Kbd>⌘E</Kbd>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={menuCls}>
            <DropdownMenuItem className={itemCls} onClick={() => onExport('dbml')}>
              DBML
              <span className="ml-auto font-mono text-[10px] text-[var(--color-text-muted)]">.dbml</span>
            </DropdownMenuItem>
            <DropdownMenuItem className={itemCls} onClick={() => onExport('json')}>
              JSON AST
              <span className="ml-auto font-mono text-[10px] text-[var(--color-text-muted)]">.json</span>
            </DropdownMenuItem>
            <DropdownMenuItem className={itemCls} onClick={() => onExport('sql')}>
              PostgreSQL
              <span className="ml-auto font-mono text-[10px] text-[var(--color-text-muted)]">.sql</span>
            </DropdownMenuItem>
            <DropdownMenuItem className={itemCls} onClick={() => onExport('sqlite')}>
              SQLite
              <span className="ml-auto font-mono text-[10px] text-[var(--color-text-muted)]">.sqlite.sql</span>
            </DropdownMenuItem>
            <DropdownMenuItem className={itemCls} onClick={() => onExport('svg')}>
              ERD
              <span className="ml-auto font-mono text-[10px] text-[var(--color-text-muted)]">.svg</span>
            </DropdownMenuItem>
            <DropdownMenuItem className={itemCls} onClick={() => onExport('prisma')}>
              Prisma
              <span className="ml-auto font-mono text-[10px] text-[var(--color-text-muted)]">.prisma</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[var(--color-border-subtle)]" />
            <DropdownMenuItem className={itemCls} onClick={handleCopyDbml}>
              Copy DBML
            </DropdownMenuItem>
            <DropdownMenuItem className={itemCls} onClick={handleCopyJson}>
              Copy AST JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[var(--color-border-subtle)]" />
            <DropdownMenuItem className={itemCls} onClick={() => onAddTableOpenChange(true)}>
              Add table
            </DropdownMenuItem>
            <DropdownMenuItem
              className={itemCls}
              disabled={isLayouting || tableCount === 0}
              onClick={() => void onAutoLayout()}
            >
              Auto layout
            </DropdownMenuItem>
            <DropdownMenuItem className={itemCls} onClick={onSave}>
              Save
            </DropdownMenuItem>
            <DropdownMenuItem
              className={itemCls}
              onClick={() => document.getElementById('import-dbml')?.click()}
            >
              Import…
            </DropdownMenuItem>
            <DropdownMenuItem className={itemCls} onClick={onSettings}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem className={itemCls} onClick={() => onShortcutsOpenChange(true)}>
              Shortcuts
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-[12px] text-[var(--color-accent-danger)] focus:bg-[var(--color-selection)]"
              onClick={onClearSchema}
            >
              Clear schema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          onClick={() => onCommandPaletteOpenChange(true)}
          className="ml-1 flex h-7 items-center rounded-md border border-[var(--color-border-subtle)] px-2 font-mono text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          title="Command palette"
          aria-label="Command palette"
        >
          ⌘K
        </button>
      </div>
    </header>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-1 py-px font-mono text-[10px] leading-none text-[var(--color-text-muted)]">
      {children}
    </kbd>
  );
}

function BranchMark() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <circle cx="4.5" cy="3.5" r="1.6" />
      <circle cx="4.5" cy="12.5" r="1.6" />
      <circle cx="11.5" cy="6.5" r="1.6" />
      <path d="M4.5 5.1v5.8M4.5 8.2h4.4A2.6 2.6 0 0 0 11.5 5.6" />
    </svg>
  );
}

function StripButton({
  icon,
  label,
  shortcut,
  title,
  disabled,
  tone,
  onClick,
}: {
  icon: MarkName;
  label: string;
  shortcut: string;
  title: string;
  disabled?: boolean;
  tone?: 'danger' | 'warning';
  onClick: () => void;
}) {
  const toneCls =
    tone === 'danger'
      ? 'text-[var(--color-accent-danger)]'
      : tone === 'warning'
        ? 'text-[var(--color-accent-warning)]'
        : 'text-[var(--color-text-muted)]';
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 items-center gap-1.5 rounded-md px-2 hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 ${toneCls}`}
    >
      <Mark name={icon} />
      {label}
      <span className="select-none text-[var(--color-text-muted)]"> ·</span>
      <Kbd>{shortcut}</Kbd>
    </button>
  );
}
