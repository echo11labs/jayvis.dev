'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme-state';

interface ShortcutsOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS = [
  { keys: ['⌘', 'K'], label: 'Open command palette' },
  { keys: ['⌘', 'Z'], label: 'Undo last action' },
  { keys: ['⌘', '⇧', 'Z'], label: 'Redo (or ⌘Y)' },
  { keys: ['⌘', '⇧', 'V'], label: 'Toggle schema validation panel' },
  { keys: ['⌘', 'F'], label: 'Search tables on the canvas' },
  { keys: ['⌘', '0'], label: 'Fit canvas to view (zoom to fit)' },
  { keys: ['⌘', 'L'], label: 'Run auto-layout on the canvas' },
  { keys: ['⌘', 'M'], label: 'Open the migration diff panel' },
  { keys: ['⌘', 'B'], label: 'Build SQL — create tables in the database' },
  { keys: ['⌘', 'T'], label: 'Create a new table (dialog)' },
  { keys: ['⇧', '?'], label: 'Toggle this shortcuts overlay' },
  { keys: ['Tab'], label: 'Insert two spaces in the editor' },
  { keys: ['Enter'], label: 'Auto-indent the next line' },
  { keys: ['Right-click', ''], label: 'Right-click a relationship for cardinality / ON DELETE / ON UPDATE' },
  { keys: ['Right-click', ''], label: 'Right-click canvas for quick actions (add table, fit view, etc.)' },
  { keys: ['Drag', ''], label: 'Drag from a column handle to create a relationship' },
  { keys: ['Click', ''], label: 'Click a table to inspect & edit its columns' },
];

export function ShortcutsOverlay({ open, onOpenChange }: ShortcutsOverlayProps) {
  const theme = useTheme();
  const isDark = theme === 'dark';
  const dialogCls = isDark
    ? 'border-zinc-800 bg-zinc-950 text-zinc-100'
    : 'border-zinc-200 bg-white text-zinc-900';
  const rowHover = isDark ? 'hover:bg-zinc-900' : 'hover:bg-zinc-100';
  const labelText = isDark ? 'text-zinc-400' : 'text-zinc-600';
  const kbdCls = isDark
    ? 'border-zinc-700 bg-zinc-900 text-zinc-300'
    : 'border-zinc-300 bg-zinc-100 text-zinc-600';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${dialogCls} sm:max-w-md`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-indigo-400" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Speed up your workflow with these shortcuts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          {SHORTCUTS.map((s) => (
            <div
              key={s.label}
              className={`flex items-center justify-between rounded-md px-2 py-1.5 ${rowHover}`}
            >
              <span className={`text-xs ${labelText}`}>{s.label}</span>
              <div className="flex items-center gap-1">
                {s.keys.filter(Boolean).map((k, i) => (
                  <kbd
                    key={i}
                    className={`min-w-[20px] rounded border px-1.5 py-0.5 text-center font-mono text-[10px] ${kbdCls}`}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
