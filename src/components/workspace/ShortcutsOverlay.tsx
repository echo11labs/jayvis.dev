'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

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
  { keys: ['⌘', 'T'], label: 'Create a new table (dialog)' },
  { keys: ['⇧', '?'], label: 'Toggle this shortcuts overlay' },
  { keys: ['Tab'], label: 'Insert two spaces in the editor' },
  { keys: ['Enter'], label: 'Auto-indent the next line' },
  { keys: ['Right-click', ''], label: 'Right-click a relationship for cardinality / ON DELETE / ON UPDATE' },
  { keys: ['Drag', ''], label: 'Drag from a column handle to create a relationship' },
  { keys: ['Click', ''], label: 'Click a table to inspect & edit its columns' },
];

export function ShortcutsOverlay({ open, onOpenChange }: ShortcutsOverlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-md">
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
              className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-zinc-900"
            >
              <span className="text-xs text-zinc-400">{s.label}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="min-w-[20px] rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-center font-mono text-[10px] text-zinc-300"
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
