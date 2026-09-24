'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Codicon } from '@/components/ui/codicon';

interface ShortcutsOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS = [
  { keys: ['⌘', 'K'], label: 'Open command palette' },
  { keys: ['⌘', 'B'], label: 'Toggle Schema Explorer' },
  { keys: ['⌘', '⇧', 'B'], label: 'Toggle Table Inspector' },
  { keys: ['⌘', '⇧', 'T'], label: 'Open theme picker' },
  { keys: ['⌘', ','], label: 'Open settings' },
  { keys: ['⌘', '1'], label: 'Code view' },
  { keys: ['⌘', '2'], label: 'Board view' },
  { keys: ['⌘', '3'], label: 'Both views' },
  { keys: ['⌘', '⇧', 'D'], label: 'Code only' },
  { keys: ['⌘', '⇧', 'E'], label: 'Board only' },
  { keys: ['⌘', '\\'], label: 'Both Code and Board' },
  { keys: ['⌘', 'Z'], label: 'Undo last action' },
  { keys: ['⌘', '⇧', 'Z'], label: 'Redo (or ⌘Y)' },
  { keys: ['⌘', '⇧', 'V'], label: 'Open Problems / validate' },
  { keys: ['⌘', 'F'], label: 'Find in Code or Board' },
  { keys: ['⌘', '0'], label: 'Fit canvas to view' },
  { keys: ['⌘', 'L'], label: 'Auto layout' },
  { keys: ['⌘', 'M'], label: 'Open Migration' },
  { keys: ['⌘', '⇧', 'S'], label: 'Open SQL builder' },
  { keys: ['⌘', 'E'], label: 'Export DBML' },
  { keys: ['⌘', 'S'], label: 'Save workspace locally' },
  { keys: ['⌘', '⇧', 'Enter'], label: 'Build SQL tables' },
  { keys: ['⌘', 'Space'], label: 'Trigger editor autocomplete' },
  { keys: ['T'], label: 'Create a new table (or ⌘T)' },
  { keys: ['Delete'], label: 'Delete selected table' },
  { keys: ['⇧', '?'], label: 'Toggle this shortcuts overlay' },
  { keys: ['Tab'], label: 'Insert two spaces in the editor' },
  { keys: ['Enter'], label: 'Auto-indent the next line' },
  { keys: ['Right-click', ''], label: 'Open table, relationship, or canvas context menu' },
  { keys: ['Drag', ''], label: 'Drag from a column handle to create a relationship' },
  { keys: ['Click', ''], label: 'Click a table or relationship to inspect it' },
];

export function ShortcutsOverlay({ open, onOpenChange }: ShortcutsOverlayProps) {
  const dialogCls = 'border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] text-[var(--color-text-primary)]';
  const rowHover = 'hover:bg-[var(--color-bg-panel)]';
  const labelText = 'text-[var(--color-text-muted)]';
  const kbdCls = 'border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] text-[var(--color-text-primary)]';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${dialogCls} sm:max-w-md`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Codicon name="keyboard" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-[var(--color-text-muted)]">
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
