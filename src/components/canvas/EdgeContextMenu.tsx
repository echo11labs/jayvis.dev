'use client';

import { useEffect, useRef } from 'react';
import { Trash2, Link2, ArrowRight } from 'lucide-react';
import { useDiagramStore } from '@/store/diagram-store';
import type { Cardinality, SchemaReference } from '@/types/ast';
import { toast } from 'sonner';

interface EdgeContextMenuProps {
  edgeId: string | null;
  x: number;
  y: number;
  onClose: () => void;
}

const CARDINALITIES: Cardinality[] = ['1:1', '1:N', 'N:M'];
const DELETE_ACTIONS = ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'] as const;
const UPDATE_ACTIONS = ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'] as const;

export function EdgeContextMenu({ edgeId, x, y, onClose }: EdgeContextMenuProps) {
  const ast = useDiagramStore((s) => s.ast);
  const updateReference = useDiagramStore((s) => s.updateReference);
  const deleteReference = useDiagramStore((s) => s.deleteReference);
  const ref = useRef<HTMLDivElement>(null);

  const reference: SchemaReference | undefined = edgeId
    ? ast.references[edgeId]
    : undefined;

  // Close on outside click or Escape.
  useEffect(() => {
    if (!edgeId) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [edgeId, onClose]);

  if (!edgeId || !reference) return null;

  const handleCardinality = (c: Cardinality) => {
    updateReference(edgeId, { cardinality: c });
    toast.success(`Cardinality set to ${c}`);
    onClose();
  };

  const handleOnDelete = (action: typeof DELETE_ACTIONS[number]) => {
    const next =
      reference.onDelete === action ? undefined : action;
    updateReference(edgeId, { onDelete: next });
    toast.success(next ? `ON DELETE ${next}` : 'ON DELETE cleared');
    onClose();
  };

  const handleOnUpdate = (action: typeof UPDATE_ACTIONS[number]) => {
    const next =
      reference.onUpdate === action ? undefined : action;
    updateReference(edgeId, { onUpdate: next });
    toast.success(next ? `ON UPDATE ${next}` : 'ON UPDATE cleared');
    onClose();
  };

  const handleDelete = () => {
    deleteReference(edgeId);
    toast.success('Relationship deleted');
    onClose();
  };

  return (
    <div
      ref={ref}
      className="fixed z-50 w-60 rounded-lg border border-zinc-800 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur-md"
      style={{ left: x, top: y }}
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-1.5 border-b border-zinc-800 px-1 pb-2">
        <Link2 className="h-3.5 w-3.5 text-indigo-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Relationship
        </span>
      </div>
      <div className="mb-2 px-1 font-mono text-[11px] text-zinc-400">
        <span className="text-indigo-300">{reference.sourceTable}</span>
        <span className="text-zinc-600">.{reference.sourceField}</span>
        <ArrowRight className="mx-1 inline h-3 w-3 text-zinc-600" />
        <span className="text-emerald-300">{reference.targetTable}</span>
        <span className="text-zinc-600">.{reference.targetField}</span>
      </div>

      {/* Cardinality */}
      <div className="mb-2">
        <div className="mb-1 px-1 text-[10px] font-medium text-zinc-500">
          Cardinality
        </div>
        <div className="grid grid-cols-3 gap-1">
          {CARDINALITIES.map((c) => (
            <button
              key={c}
              onClick={() => handleCardinality(c)}
              className={`rounded px-2 py-1 text-[11px] font-mono font-medium transition-colors ${
                reference.cardinality === c
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ON DELETE */}
      <div className="mb-2">
        <div className="mb-1 px-1 text-[10px] font-medium text-zinc-500">
          On Delete
        </div>
        <div className="grid grid-cols-2 gap-1">
          {DELETE_ACTIONS.map((a) => (
            <button
              key={a}
              onClick={() => handleOnDelete(a)}
              className={`rounded px-1.5 py-1 text-[10px] font-mono transition-colors ${
                reference.onDelete === a
                  ? 'bg-rose-600/80 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* ON UPDATE */}
      <div className="mb-2">
        <div className="mb-1 px-1 text-[10px] font-medium text-zinc-500">
          On Update
        </div>
        <div className="grid grid-cols-2 gap-1">
          {UPDATE_ACTIONS.map((a) => (
            <button
              key={a}
              onClick={() => handleOnUpdate(a)}
              className={`rounded px-1.5 py-1 text-[10px] font-mono transition-colors ${
                reference.onUpdate === a
                  ? 'bg-amber-600/80 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="mt-1 flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-xs text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete relationship
      </button>
    </div>
  );
}
