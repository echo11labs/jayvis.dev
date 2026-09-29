'use client';

import { useState, useMemo, useEffect } from 'react';
import { Codicon } from '@/components/ui/codicon';
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'f') return;
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
          target.isContentEditable);
      if (isTyping) return;
      e.preventDefault();
      setOpen((v) => !v);
    };
    const openFind = () => setOpen(true);
    window.addEventListener('keydown', handler);
    window.addEventListener('jayvis:canvas-find', openFind);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('jayvis:canvas-find', openFind);
    };
  }, []);

  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-10 w-64">
      {open ? (
        <div className="border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)]">
          <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] px-2.5 py-2">
            <Codicon name="search" />
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
              className="flex-1 bg-transparent text-xs text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
            />
            <button
              onClick={() => {
                setOpen(false);
                setQuery('');
              }}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <Codicon name="close" />
            </button>
          </div>
          {results.length > 0 && (
            <div className="max-h-64 overflow-y-auto py-1">
              {results.map((t) => (
                <button
                  key={t.name}
                  onClick={() => focusTable(t.name)}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-[var(--color-bg-panel)]"
                >
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: t.color || 'var(--color-accent-primary)' }}
                  />
                  <span className="font-mono text-[var(--color-text-primary)]">{t.name}</span>
                  <span className="ml-auto font-mono text-[10px] text-[var(--color-text-muted)]">
                    {t.fields.length} col
                  </span>
                </button>
              ))}
            </div>
          )}
          {results.length === 0 && (
            <div className="px-2.5 py-3 text-center text-[11px] text-[var(--color-text-muted)]">
              No tables match “{query}”
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
