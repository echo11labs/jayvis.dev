'use client';

import { useMemo, useState } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { useDiagramStore } from '@/store/diagram-store';
import { InspectorPanel } from '@/components/workspace/InspectorPanel';
import type { Cardinality, SchemaReference } from '@/types/ast';
import { Codicon } from '@/components/ui/codicon';
import { Mark } from '@/lib/ui/marks';
import type { SampleName } from '@/components/workspace/Toolbar';
import { toast } from 'sonner';
import { confirmIf } from '@/lib/confirm-action';
import { Disclosure } from '@/components/workspace/Disclosure';

interface ContextPanelProps {
  onLoadSample?: (name: SampleName) => void;
  onAddTable?: () => void;
  onImport?: () => void;
  onClose: () => void;
}

const cardinalities: Cardinality[] = ['1:1', '1:N', 'N:M'];
const actions = ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'] as const;

export function ContextPanel({ onClose }: ContextPanelProps) {
  const selectedTable = useDiagramStore((s) => s.selectedTable);
  const selectedEdge = useDiagramStore((s) => s.selectedEdge);
  const ast = useDiagramStore((s) => s.ast);
  const setSelectedEdge = useDiagramStore((s) => s.setSelectedEdge);
  const updateReference = useDiagramStore((s) => s.updateReference);
  const deleteReference = useDiagramStore((s) => s.deleteReference);
  const setSelectedTable = useDiagramStore((s) => s.setSelectedTable);
  const [sections, setSections] = useState({ ends: true, cardinality: true, actions: true });
  const toggleSection = (key: keyof typeof sections) => {
    setSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const reference: SchemaReference | null = useMemo(
    () => (selectedEdge ? ast.references[selectedEdge] ?? null : null),
    [ast.references, selectedEdge],
  );

  if (selectedTable) {
    return <InspectorPanel onClose={onClose} />;
  }

  const panelClasses = 'border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] text-[var(--color-text-primary)]';
  const muted = 'text-[var(--color-text-muted)]';
  const input = 'border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] text-[var(--color-text-primary)]';

  return (
    <div className={`flex h-full flex-col border-l ${panelClasses}`} role="complementary" aria-label="Table Inspector">
      <div className="group flex h-8 shrink-0 items-center justify-between border-b border-[var(--color-border-subtle)] px-3">
        <span className="text-[12px] text-[var(--color-text-primary)]">
          {reference ? 'Relationship' : 'Table Inspector'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)] hover:text-[var(--color-text-primary)]"
          aria-label="Close inspector"
        >
          <Mark name="close" />
        </button>
      </div>

      {reference ? (
        <ScrollArea className="flex-1">
          <Disclosure
            label="Ends"
            open={sections.ends}
            onOpenChange={() => toggleSection('ends')}
            detail={`${reference.sourceTable} → ${reference.targetTable}`}
          >
            <div className="mx-2 space-y-2 border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] p-2.5 font-mono text-[12px]">
              <button type="button" onClick={() => setSelectedTable(reference.sourceTable)} className="block w-full text-left">
                <span className="text-[10px] tracking-wide text-[var(--color-text-muted)]">Source</span>
                <span className="mt-0.5 block text-[var(--color-text-primary)]">
                  {reference.sourceTable}
                  <span className="text-[var(--color-text-muted)]">.{reference.sourceField}</span>
                </span>
              </button>
              <button type="button" onClick={() => setSelectedTable(reference.targetTable)} className="block w-full text-left">
                <span className="text-[10px] tracking-wide text-[var(--color-text-muted)]">Target</span>
                <span className="mt-0.5 block text-[var(--color-text-primary)]">
                  {reference.targetTable}
                  <span className="text-[var(--color-text-muted)]">.{reference.targetField}</span>
                </span>
              </button>
            </div>
          </Disclosure>

          <Disclosure
            label="Cardinality"
            open={sections.cardinality}
            onOpenChange={() => toggleSection('cardinality')}
            detail={reference.cardinality}
          >
            <label className="block px-2">
              <select
                value={reference.cardinality}
                onChange={(e) => updateReference(reference.id, { cardinality: e.target.value as Cardinality })}
                className={`h-8 w-full border px-2 text-xs outline-none focus:border-[var(--color-accent-primary)] ${input}`}
              >
                {cardinalities.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
          </Disclosure>

          <Disclosure
            label="Referential actions"
            open={sections.actions}
            onOpenChange={() => toggleSection('actions')}
            detail={reference.onDelete ?? 'NO ACTION'}
          >
            <div className="space-y-2 px-2">
              <label className="block">
                <span className="mb-1 block text-[11px] text-[var(--color-text-muted)]">On delete</span>
                <select
                  value={reference.onDelete ?? 'NO ACTION'}
                  onChange={(e) => updateReference(reference.id, { onDelete: e.target.value as SchemaReference['onDelete'] })}
                  className={`h-8 w-full border px-2 text-[11px] outline-none focus:border-[var(--color-accent-primary)] ${input}`}
                >
                  {actions.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] text-[var(--color-text-muted)]">On update</span>
                <select
                  value={reference.onUpdate ?? 'NO ACTION'}
                  onChange={(e) => updateReference(reference.id, { onUpdate: e.target.value as SchemaReference['onUpdate'] })}
                  className={`h-8 w-full border px-2 text-[11px] outline-none focus:border-[var(--color-accent-primary)] ${input}`}
                >
                  {actions.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            </div>
          </Disclosure>

          <div className="p-2">
            <button
              className="flex h-8 w-full items-center justify-start rounded-md px-2 text-xs text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
              onClick={() => {
                confirmIf(true, {
                  title: 'Delete relationship?',
                  description: 'This removes the foreign key from the schema. You can undo this.',
                  confirmLabel: 'Delete',
                  action: () => {
                    deleteReference(reference.id);
                    setSelectedEdge(null);
                    toast.success('Relationship deleted');
                  },
                });
              }}
            >
              <Codicon name="trash" className="mr-1.5" />
              Delete relationship
            </button>
          </div>
        </ScrollArea>
      ) : (
        <p className={`px-3 py-5 text-[12px] ${muted}`}>
          Select a table from the explorer or board.
        </p>
      )}
    </div>
  );
}
