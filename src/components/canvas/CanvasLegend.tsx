'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Key, Link2, Asterisk, Zap, Equal } from 'lucide-react';

/**
 * Floating legend that explains the table-node badges and indicators.
 * Collapsible so it doesn't obstruct the canvas.
 */
export function CanvasLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-10 w-56 rounded-lg border border-zinc-800 bg-zinc-950/90 shadow-2xl backdrop-blur-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400"
      >
        <span>Legend</span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>
      {open && (
        <div className="space-y-2 border-t border-zinc-800 px-3 py-2.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/15 text-[9px] font-bold text-amber-400 border border-amber-500/25">
              <Key className="h-2.5 w-2.5" />
            </span>
            <span className="text-zinc-400">Primary Key</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-500/15 text-[9px] font-bold text-sky-400 border border-sky-500/25">
              UQ
            </span>
            <span className="text-zinc-400">Unique constraint</span>
          </div>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-indigo-400" />
            <span className="text-zinc-400">Foreign Key</span>
          </div>
          <div className="flex items-center gap-2">
            <Asterisk className="h-4 w-4 text-rose-400 font-bold" />
            <span className="text-zinc-400">NOT NULL</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-zinc-400">Auto-increment</span>
          </div>
          <div className="flex items-center gap-2">
            <Equal className="h-4 w-4 text-emerald-500" />
            <span className="text-zinc-400">Has default value</span>
          </div>
          <div className="mt-2 border-t border-zinc-800 pt-2">
            <p className="text-[10px] text-zinc-600">
              Drag from a column handle to create a relationship. Click a table
              to inspect it.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
