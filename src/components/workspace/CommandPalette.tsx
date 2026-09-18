'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Plus,
  LayoutGrid,
  GitCompare,
  FileCode2,
  Database,
  Keyboard,
  Trash2,
  Download,
  Code2,
  Sparkles,
  Boxes,
  Image as ImageIcon,
  ShieldCheck,
  Undo2,
  Redo2,
} from 'lucide-react';
import { useDiagramStore } from '@/store/diagram-store';
import { serializeDBML } from '@/lib/parser/dbml';
import { exportDDL } from '@/lib/export/ddl';
import { downloadErdSvg } from '@/lib/export/erd-svg';
import { toast } from 'sonner';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAutoLayout: () => void;
  onGenerateMigration: () => void;
  onAddTableOpenChange: (open: boolean) => void;
  onShortcutsOpenChange: (open: boolean) => void;
  onValidationOpenChange: (open: boolean) => void;
  onLoadSample: (name: 'ecommerce' | 'blog' | 'saas') => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onAutoLayout,
  onGenerateMigration,
  onAddTableOpenChange,
  onShortcutsOpenChange,
  onValidationOpenChange,
  onLoadSample,
}: CommandPaletteProps) {
  const ast = useDiagramStore((s) => s.ast);
  const loadAST = useDiagramStore((s) => s.loadAST);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleExportDDL = useCallback(() => {
    const ddl = exportDDL(ast);
    const blob = new Blob([ddl], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.sql';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported schema.sql (DDL)');
    close();
  }, [ast, close]);

  const handleExportDBML = useCallback(() => {
    const dbml = serializeDBML(ast);
    const blob = new Blob([dbml], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.dbml';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported schema.dbml');
    close();
  }, [ast, close]);

  const handleExportErd = useCallback(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    for (const n of useDiagramStore.getState().nodes) {
      positions[n.id] = { x: n.position.x, y: n.position.y };
    }
    downloadErdSvg(ast, positions);
    toast.success('Exported stitchdb-erd.svg');
    close();
  }, [ast, close]);

  const handleClear = useCallback(() => {
    loadAST({ version: '1.0', tables: {}, references: {} });
    toast.success('Schema cleared');
    close();
  }, [loadAST, close]);

  const run = useCallback(
    (fn: () => void) => () => {
      fn();
      close();
    },
    [close],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={run(() => onAddTableOpenChange(true))}>
            <Plus className="mr-2 h-4 w-4 text-indigo-400" />
            Create table
            <kbd className="ml-auto font-mono text-[10px] text-zinc-500">⌘T</kbd>
          </CommandItem>
          <CommandItem onSelect={run(onAutoLayout)}>
            <LayoutGrid className="mr-2 h-4 w-4 text-emerald-400" />
            Auto layout
            <kbd className="ml-auto font-mono text-[10px] text-zinc-500">⌘L</kbd>
          </CommandItem>
          <CommandItem onSelect={run(onGenerateMigration)}>
            <GitCompare className="mr-2 h-4 w-4 text-amber-400" />
            Generate migration
            <kbd className="ml-auto font-mono text-[10px] text-zinc-500">⌘M</kbd>
          </CommandItem>
          <CommandItem onSelect={run(() => onShortcutsOpenChange(true))}>
            <Keyboard className="mr-2 h-4 w-4 text-sky-400" />
            Show keyboard shortcuts
          </CommandItem>
          <CommandItem onSelect={run(() => onValidationOpenChange(true))}>
            <ShieldCheck className="mr-2 h-4 w-4 text-indigo-400" />
            Validate schema
            <kbd className="ml-auto font-mono text-[10px] text-zinc-500">⌘⇧V</kbd>
          </CommandItem>
          <CommandItem onSelect={run(() => useDiagramStore.getState().undo())}>
            <Undo2 className="mr-2 h-4 w-4 text-zinc-400" />
            Undo
            <kbd className="ml-auto font-mono text-[10px] text-zinc-500">⌘Z</kbd>
          </CommandItem>
          <CommandItem onSelect={run(() => useDiagramStore.getState().redo())}>
            <Redo2 className="mr-2 h-4 w-4 text-zinc-400" />
            Redo
            <kbd className="ml-auto font-mono text-[10px] text-zinc-500">⌘⇧Z</kbd>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Export">
          <CommandItem onSelect={handleExportDDL}>
            <Code2 className="mr-2 h-4 w-4 text-cyan-400" />
            Export as SQL DDL
          </CommandItem>
          <CommandItem onSelect={handleExportDBML}>
            <FileCode2 className="mr-2 h-4 w-4 text-violet-400" />
            Export as DBML
          </CommandItem>
          <CommandItem onSelect={handleExportErd}>
            <ImageIcon className="mr-2 h-4 w-4 text-emerald-400" />
            Export ERD as SVG
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Load sample schema">
          <CommandItem onSelect={run(() => onLoadSample('ecommerce'))}>
            <Boxes className="mr-2 h-4 w-4 text-indigo-400" />
            E-commerce
          </CommandItem>
          <CommandItem onSelect={run(() => onLoadSample('blog'))}>
            <Boxes className="mr-2 h-4 w-4 text-emerald-400" />
            Blog / CMS
          </CommandItem>
          <CommandItem onSelect={run(() => onLoadSample('saas'))}>
            <Boxes className="mr-2 h-4 w-4 text-pink-400" />
            SaaS Multi-tenant
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Schema">
          <CommandItem onSelect={() => { /* future: navigate to table */ }}>
            <Database className="mr-2 h-4 w-4 text-zinc-400" />
            {Object.keys(ast.tables).length} table(s), {Object.keys(ast.references).length} reference(s)
          </CommandItem>
          <CommandItem onSelect={handleClear} className="text-rose-400">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear all tables
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
