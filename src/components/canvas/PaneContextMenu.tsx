'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Plus, LayoutGrid, Maximize, Sparkles, Database } from 'lucide-react';
import { useDiagramStore } from '@/store/diagram-store';

interface PaneContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onAddTable: () => void;
  onAutoLayout: () => void;
  onFitView: () => void;
}

/**
 * Right-click context menu for the canvas pane (empty area).
 * Offers quick actions: Add table, Auto layout, Fit view, Clear schema.
 */
export function PaneContextMenu({
  open,
  x,
  y,
  onClose,
  onAddTable,
  onAutoLayout,
  onFitView,
}: PaneContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const loadAST = useDiagramStore((s) => s.loadAST);
  const tableCount = useDiagramStore((s) => Object.keys(s.ast.tables).length);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, close]);

  const handleClear = () => {
    loadAST({ version: '1.0', tables: {}, references: {} });
    close();
  };

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="fixed z-50 w-56 rounded-lg border border-zinc-800 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-md"
      style={{ left: x, top: y }}
    >
      <div className="mb-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
        Canvas actions
      </div>
      <MenuItem icon={Plus} label="Add table" shortcut="⌘T" onClick={() => { onAddTable(); close(); }} />
      <MenuItem icon={LayoutGrid} label="Auto layout" shortcut="⌘L" onClick={() => { onAutoLayout(); close(); }} />
      <MenuItem icon={Maximize} label="Fit view" shortcut="⌘0" onClick={() => { onFitView(); close(); }} />
      <div className="my-1 h-px bg-zinc-800" />
      <MenuItem
        icon={Database}
        label="Clear schema"
        onClick={handleClear}
        danger
        disabled={tableCount === 0}
      />
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  shortcut,
  onClick,
  danger,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? 'text-rose-400 hover:bg-rose-500/10'
          : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
      {shortcut && (
        <kbd className="ml-auto font-mono text-[10px] text-zinc-600">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
