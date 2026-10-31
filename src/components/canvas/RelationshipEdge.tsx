'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import { useDiagramStore } from '@/store/diagram-store';
import type { Cardinality } from '@/types/ast';
import { Codicon } from '@/components/ui/codicon';
import { toast } from 'sonner';

const CARDINALITY_OPTIONS: Cardinality[] = ['1:N', 'N:1', '1:1', 'N:M'];
const DELETE_ACTIONS = ['CASCADE', 'SET NULL', 'RESTRICT'] as const;

export function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
  selected,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const ast = useDiagramStore((s) => s.ast);
  const updateReference = useDiagramStore((s) => s.updateReference);
  const deleteReference = useDiagramStore((s) => s.deleteReference);
  const setSelectedEdge = useDiagramStore((s) => s.setSelectedEdge);

  const refData = ast.references[id];

  const rawMark = (typeof label === 'string' && label) ? label : (data?.label as string) || '';
  const isActive = Boolean(data?.isActive || selected || popoverOpen);
  const sourceTable = refData?.sourceTable || (data?.sourceTable as string) || '';
  const targetTable = refData?.targetTable || (data?.targetTable as string) || '';
  const sourceField = refData?.sourceField || (data?.sourceField as string) || '';
  const targetField = refData?.targetField || (data?.targetField as string) || '';

  // Close popover on click outside or Escape
  useEffect(() => {
    if (!popoverOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopoverOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [popoverOpen]);

  // Standardize mark string
  let mark = rawMark;
  if (refData?.cardinality) {
    if (refData.cardinality === '1:N') mark = '1 : *';
    else if (refData.cardinality === 'N:1') mark = '* : 1';
    else if (refData.cardinality === '1:1') mark = '1 : 1';
    else if (refData.cardinality === 'N:M') mark = '* : *';
  } else {
    if (mark === '1:N' || mark === '1:*') mark = '1 : *';
    else if (mark === 'N:1' || mark === '*:1') mark = '* : 1';
    else if (mark === '1:1') mark = '1 : 1';
    else if (mark === 'N:M' || mark === '*:*') mark = '* : *';
  }

  const isOneToOne = mark === '1 : 1';
  const isManyToMany = mark === '* : *';
  const isManyToOne = mark === '* : 1';

  // Badge tones per cardinality type
  let badgeClasses = 'border-cyan-500/40 text-cyan-400 bg-cyan-950/80 shadow-cyan-950/50';
  let badgeLightClasses = 'border-cyan-400 text-cyan-700 bg-cyan-50/90 shadow-cyan-100';
  let badgeTitle = 'One-to-Many (1 : *)';

  if (isManyToOne) {
    badgeClasses = 'border-indigo-500/40 text-indigo-400 bg-indigo-950/80 shadow-indigo-950/50';
    badgeLightClasses = 'border-indigo-400 text-indigo-700 bg-indigo-50/90 shadow-indigo-100';
    badgeTitle = 'Many-to-One (* : 1)';
  } else if (isOneToOne) {
    badgeClasses = 'border-emerald-500/40 text-emerald-400 bg-emerald-950/80 shadow-emerald-950/50';
    badgeLightClasses = 'border-emerald-400 text-emerald-700 bg-emerald-50/90 shadow-emerald-100';
    badgeTitle = 'One-to-One (1 : 1)';
  } else if (isManyToMany) {
    badgeClasses = 'border-amber-500/40 text-amber-400 bg-amber-950/80 shadow-amber-950/50';
    badgeLightClasses = 'border-amber-400 text-amber-700 bg-amber-50/90 shadow-amber-100';
    badgeTitle = 'Many-to-Many (* : *)';
  }

  const tooltip = sourceTable && targetTable
    ? `${badgeTitle}\n${sourceTable}.${sourceField} → ${targetTable}.${targetField}\nClick to edit cardinality`
    : `${badgeTitle} — Click to edit`;

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEdge(id);
    setPopoverOpen(!popoverOpen);
  };

  const handleSelectCardinality = (c: Cardinality) => {
    if (!refData) return;
    updateReference(id, { cardinality: c });
    toast.success(`Cardinality updated to ${c}`);
  };

  const handleToggleOnDelete = (action: typeof DELETE_ACTIONS[number]) => {
    if (!refData) return;
    const next = refData.onDelete === action ? undefined : action;
    updateReference(id, { onDelete: next });
    toast.success(next ? `ON DELETE ${next}` : 'Cleared ON DELETE');
  };

  const handleFlipDirection = () => {
    if (!refData) return;
    updateReference(id, {
      sourceTable: refData.targetTable,
      sourceField: refData.targetField,
      targetTable: refData.sourceTable,
      targetField: refData.sourceField,
      cardinality:
        refData.cardinality === '1:N'
          ? 'N:1'
          : refData.cardinality === 'N:1'
            ? '1:N'
            : refData.cardinality,
    });
    toast.success('Reversed relationship direction');
  };

  const handleDelete = () => {
    deleteReference(id);
    toast.success('Relationship removed');
    setPopoverOpen(false);
  };

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {mark ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: isActive ? 45 : 15,
            }}
            className="nodrag nopan select-none cursor-pointer group"
          >
            {/* Clickable Badge */}
            <div
              onClick={handleBadgeClick}
              className={`flex items-center justify-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider transition-all duration-150 shadow-sm backdrop-blur-md border ${
                isActive
                  ? 'scale-110 shadow-md ring-2 ring-[var(--color-accent-primary)]'
                  : 'opacity-90 hover:opacity-100 hover:scale-105'
              } dark:${badgeClasses} ${badgeLightClasses}`}
              title={tooltip}
            >
              <span>{mark}</span>
            </div>

            {/* Inline Relationship Editor Popover */}
            {popoverOpen && refData && (
              <div
                ref={popoverRef}
                onClick={(e) => e.stopPropagation()}
                className="absolute left-1/2 top-full mt-2 -translate-x-1/2 z-50 w-64 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)]/95 p-3 text-xs shadow-2xl backdrop-blur-md"
              >
                {/* Header */}
                <div className="mb-2 flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-1.5 font-mono text-[11px]">
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {sourceTable}.{sourceField} → {targetTable}.{targetField}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPopoverOpen(false)}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  >
                    ×
                  </button>
                </div>

                {/* Cardinality Selector */}
                <div className="mb-2.5">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                    Cardinality
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {CARDINALITY_OPTIONS.map((c) => {
                      const isSel = refData.cardinality === c;
                      const labelText =
                        c === '1:N'
                          ? '1 : *'
                          : c === 'N:1'
                            ? '* : 1'
                            : c === '1:1'
                              ? '1 : 1'
                              : '* : *';
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleSelectCardinality(c)}
                          className={`rounded border py-1 font-mono text-[10px] font-bold transition-colors ${
                            isSel
                              ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] text-white'
                              : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                          }`}
                        >
                          {labelText}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Referential Integrity (ON DELETE) */}
                <div className="mb-2.5">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                    On Delete Action
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {DELETE_ACTIONS.map((act) => {
                      const isSel = refData.onDelete === act;
                      return (
                        <button
                          key={act}
                          type="button"
                          onClick={() => handleToggleOnDelete(act)}
                          className={`truncate rounded border px-1 py-0.5 text-[9px] font-medium transition-colors ${
                            isSel
                              ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400 font-bold'
                              : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                          }`}
                        >
                          {act}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions: Reverse & Delete */}
                <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-2">
                  <button
                    type="button"
                    onClick={handleFlipDirection}
                    className="flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    title="Reverse direction between source and target"
                  >
                    <Codicon name="references" className="h-3 w-3" />
                    <span>Flip Direction</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center gap-1 text-[11px] text-[var(--color-accent-danger)] hover:underline"
                  >
                    <Codicon name="trash" className="h-3 w-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
