'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useDiagramStore } from '@/store/diagram-store';
import { useReactFlow } from '@xyflow/react';
import type { SchemaTable } from '@/types/ast';

/**
 * Floating table search/filter overlay on the canvas.
 * - Typing filters the visible table list.
 * - Clicking a result centers the canvas on that table and selects it.
 */
export function SchemaSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ast = useDiagramStore((s) => s.ast);
  const setSelectedTable = useDiagramStore((s) => s.setSelectedTable);
  const { setCenter, getNode } = useReactFlow();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = Object.values(ast.tables) as SchemaTable[];
    if (!q) return all;
    return all.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.fields.some((f) => f.name.toLowerCase().includes(q)),
    );
  }, [ast.tables, query]);

  const focusTable = (name: string) => {
    const node = getNode(name);
    if (node) {
      setCenter(node.position.x + 130, node.position.y + 90, {
        zoom: 1.2,
        duration: 500,
      });
    }
    setSelectedTable(name);
    setOpen(false);
    setQuery('');
  };

  // ⌘F opens the search within the canvas
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-10 w-64">
      {open ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/95 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-2.5 py-2">
            <Search className="h-3.5 w-3.5 text-zinc-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && results[0]) {
                  focusTable(results[0].name);
                }
                if (e.key === 'Escape') {
                  setOpen(false);
                  setQuery('');
                }
              }}
              placeholder="Search tables & columns…"
              className="flex-1 bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
            />
            <button
              onClick={() => {
                setOpen(false);
                setQuery('');
              }}
              className="text-zinc-600 hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {results.length > 0 && (
            <div className="max-h-64 overflow-y-auto py-1">
              {results.map((t) => (
                <button
                  key={t.name}
                  onClick={() => focusTable(t.name)}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-zinc-900"
                >
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: t.color || '#6366F1' }}
                  />
                  <span className="font-mono text-zinc-200">{t.name}</span>
                  <span className="ml-auto font-mono text-[10px] text-zinc-600">
                    {t.fields.length} col
                  </span>
                </button>
              ))}
            </div>
          )}
          {results.length === 0 && (
            <div className="px-2.5 py-3 text-center text-[11px] text-zinc-600">
              No tables match “{query}”
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/90 px-2.5 py-1.5 text-xs text-zinc-400 shadow-2xl backdrop-blur-sm transition-colors hover:border-zinc-700 hover:text-zinc-200"
          title="Search tables (⌘F)"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search tables</span>
          <kbd className="ml-1 rounded bg-zinc-800 px-1 py-0.5 font-mono text-[9px] text-zinc-500">
            ⌘F
          </kbd>
        </button>
      )}
    </div>
  );
}
