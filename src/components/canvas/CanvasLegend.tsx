'use client';

import { useState } from 'react';
import { Codicon } from '@/components/ui/codicon';

/**
 * Floating legend that explains the table-node badges and indicators.
 * Collapsible so it doesn't obstruct the canvas.
 */
export function CanvasLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-10 w-56 border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
      >
        <span>Legend</span>
        <Codicon name={open ? 'chevronUp' : 'chevronDown'} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-[var(--color-border-subtle)] px-3 py-2.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-[var(--color-accent-warning)]">PK</span>
            <span className="text-[var(--color-text-muted)]">Primary Key</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-[var(--color-accent-info)]">FK</span>
            <span className="text-[var(--color-text-muted)]">Foreign Key</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-[var(--color-text-muted)]">UQ</span>
            <span className="text-[var(--color-text-muted)]">Unique constraint</span>
          </div>
          <div className="flex items-center gap-2">
            <Codicon name="hash" />
            <span className="text-[var(--color-text-muted)]">NOT NULL</span>
          </div>
          <div className="flex items-center gap-2">
            <Codicon name="increment" />
            <span className="text-[var(--color-text-muted)]">Auto-increment</span>
          </div>
          <div className="flex items-center gap-2">
            <Codicon name="equal" />
            <span className="text-[var(--color-text-muted)]">Has default value</span>
          </div>
          <div className="mt-2 border-t border-[var(--color-border-subtle)] pt-2">
            <p className="text-[10px] text-[var(--color-text-muted)]">
              Drag from a column handle to create a relationship. Click a table
              to inspect it.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
