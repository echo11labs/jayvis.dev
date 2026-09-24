'use client';

import { useCallback } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Codicon } from '@/components/ui/codicon';
import { useDiagramStore } from '@/store/diagram-store';
import type { SampleName } from '@/components/workspace/Toolbar';
import type { ExportFormat } from '@/lib/export/workspace';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAutoLayout: () => void;
  onGenerateMigration: () => void;
  onSqlBuilderOpenChange: (open: boolean) => void;
  onAddTableOpenChange: (open: boolean) => void;
  onShortcutsOpenChange: (open: boolean) => void;
  onValidationOpenChange: (open: boolean) => void;
  onThemePickerOpenChange: (open: boolean) => void;
  onSettingsOpen: () => void;
  onLoadSample: (name: SampleName) => void;
  onClearSchema: () => void;
  onExport: (format: ExportFormat) => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onAutoLayout,
  onGenerateMigration,
  onSqlBuilderOpenChange,
  onAddTableOpenChange,
  onShortcutsOpenChange,
  onValidationOpenChange,
  onThemePickerOpenChange,
  onSettingsOpen,
  onLoadSample,
  onClearSchema,
  onExport,
}: CommandPaletteProps) {
  const tableCount = useDiagramStore((s) => Object.keys(s.ast.tables).length);
  const refCount = useDiagramStore((s) => Object.keys(s.ast.references).length);
  const dialogCls =
    'border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] text-[var(--color-text-primary)]';
  const kbdCls = 'text-[var(--color-text-muted)]';
  const mutedIcon = 'mr-2 text-[var(--color-text-muted)]';

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleClear = useCallback(() => {
    onClearSchema();
    close();
  }, [onClearSchema, close]);

  const run = useCallback(
    (fn: () => void) => () => {
      close();
      queueMicrotask(fn);
    },
    [close],
  );

  if (!open) return null;

  return (
    <CommandDialog open onOpenChange={onOpenChange} className={dialogCls}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={run(() => onAddTableOpenChange(true))}>
            <Codicon name="plus" className="mr-2" />
            Create table
            <kbd className={`ml-auto font-mono text-[10px] ${kbdCls}`}>T</kbd>
          </CommandItem>
          <CommandItem onSelect={run(onAutoLayout)} disabled={tableCount === 0}>
            <Codicon name="layout" className="mr-2" />
            Auto layout
            <kbd className={`ml-auto font-mono text-[10px] ${kbdCls}`}>⌘L</kbd>
          </CommandItem>
          <CommandItem onSelect={run(onGenerateMigration)} disabled={tableCount === 0}>
            <Codicon name="diff" className="mr-2" />
            Generate migration
            <kbd className={`ml-auto font-mono text-[10px] ${kbdCls}`}>⌘M</kbd>
          </CommandItem>
          <CommandItem onSelect={run(() => onSqlBuilderOpenChange(true))} disabled={tableCount === 0}>
            <Codicon name="terminal" className="mr-2" />
            Build SQL — create tables in database
            <kbd className={`ml-auto font-mono text-[10px] ${kbdCls}`}>⌘⇧S</kbd>
          </CommandItem>
          <CommandItem onSelect={run(() => onShortcutsOpenChange(true))}>
            <Codicon name="keyboard" className="mr-2" />
            Show keyboard shortcuts
            <kbd className={`ml-auto font-mono text-[10px] ${kbdCls}`}>⇧?</kbd>
          </CommandItem>
          <CommandItem onSelect={run(() => onThemePickerOpenChange(true))}>
            <Codicon name="palette" className="mr-2" />
            Open theme picker
            <kbd className={`ml-auto font-mono text-[10px] ${kbdCls}`}>⌘⇧T</kbd>
          </CommandItem>
          <CommandItem onSelect={run(onSettingsOpen)}>
            <Codicon name="settings" className="mr-2" />
            Open settings
            <kbd className={`ml-auto font-mono text-[10px] ${kbdCls}`}>⌘,</kbd>
          </CommandItem>
          <CommandItem onSelect={run(() => onValidationOpenChange(true))}>
            <Codicon name="shield" className="mr-2" />
            Validate schema
            <kbd className={`ml-auto font-mono text-[10px] ${kbdCls}`}>⌘⇧V</kbd>
          </CommandItem>
          <CommandItem onSelect={run(() => useDiagramStore.getState().undo())}>
            <Codicon name="undo" className={mutedIcon} />
            Undo
            <kbd className={`ml-auto font-mono text-[10px] ${kbdCls}`}>⌘Z</kbd>
          </CommandItem>
          <CommandItem onSelect={run(() => useDiagramStore.getState().redo())}>
            <Codicon name="redo" className={mutedIcon} />
            Redo
            <kbd className={`ml-auto font-mono text-[10px] ${kbdCls}`}>⌘⇧Z</kbd>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Export">
          <CommandItem onSelect={run(() => onExport('sql'))}>
            <Codicon name="code" className="mr-2" />
            Export PostgreSQL
          </CommandItem>
          <CommandItem onSelect={run(() => onExport('sqlite'))}>
            <Codicon name="database" className="mr-2" />
            Export SQLite
          </CommandItem>
          <CommandItem onSelect={run(() => onExport('dbml'))}>
            <Codicon name="fileCode" className="mr-2" />
            Export as DBML
            <kbd className={`ml-auto font-mono text-[10px] ${kbdCls}`}>⌘E</kbd>
          </CommandItem>
          <CommandItem onSelect={run(() => onExport('svg'))}>
            <Codicon name="image" className="mr-2" />
            Export ERD as SVG
          </CommandItem>
          <CommandItem onSelect={run(() => onExport('json'))}>
            <Codicon name="json" className="mr-2" />
            Export as JSON AST
          </CommandItem>
          <CommandItem onSelect={run(() => onExport('prisma'))}>
            <Codicon name="symbolClass" className="mr-2" />
            Export as Prisma schema
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Load sample schema">
          <CommandItem onSelect={run(() => onLoadSample('ecommerce'))}>
            <Codicon name="fileCode" className="mr-2" />
            E-commerce
          </CommandItem>
          <CommandItem onSelect={run(() => onLoadSample('blog'))}>
            <Codicon name="fileCode" className="mr-2" />
            Blog / CMS
          </CommandItem>
          <CommandItem onSelect={run(() => onLoadSample('saas'))}>
            <Codicon name="fileCode" className="mr-2" />
            SaaS Multi-tenant
          </CommandItem>
          <CommandItem onSelect={run(() => onLoadSample('auth'))}>
            <Codicon name="fileCode" className="mr-2" />
            Auth &amp; Sessions
          </CommandItem>
          <CommandItem onSelect={run(() => onLoadSample('analytics'))}>
            <Codicon name="fileCode" className="mr-2" />
            Analytics &amp; Events
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Schema">
          <CommandItem disabled>
            <Codicon name="database" className={mutedIcon} />
            {tableCount} table(s), {refCount} reference(s)
          </CommandItem>
          <CommandItem onSelect={handleClear} disabled={tableCount === 0} className="text-rose-400">
            <Codicon name="trash" className="mr-2" />
            Clear all tables
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
