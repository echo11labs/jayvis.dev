'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Codicon } from '@/components/ui/codicon';
import type { IconName } from '@/lib/ui/icons';
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
    window.dispatchEvent(new CustomEvent('jayvis:clear-schema'));
    close();
  };

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="fixed z-50 w-56 border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] p-1.5"
      style={{ left: x, top: y }}
    >
      <div className="mb-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        Canvas actions
      </div>
      <MenuItem icon="plus" label="Add table" shortcut="T" onClick={() => { onAddTable(); close(); }} />
      <MenuItem icon="layout" label="Auto layout" shortcut="⌘L" onClick={() => { onAutoLayout(); close(); }} />
      <MenuItem icon="maximize" label="Fit view" shortcut="⌘0" onClick={() => { onFitView(); close(); }} />
      <div className="my-1 h-px bg-[var(--color-border-subtle)]" />
      <MenuItem
        icon="trash"
        label="Clear schema"
        onClick={handleClear}
        danger
        disabled={tableCount === 0}
      />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  shortcut,
  onClick,
  danger,
  disabled,
}: {
  icon: IconName;
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
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${danger
          ? 'text-rose-400 hover:bg-rose-500/10'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-panel)] hover:text-[var(--color-text-primary)]'
        }`}
    >
      <Codicon name={icon} />
      <span>{label}</span>
      {shortcut && (
        <kbd className="ml-auto font-mono text-[10px] text-[var(--color-text-muted)]">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
