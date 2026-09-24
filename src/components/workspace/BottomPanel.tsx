'use client';

import { useMemo, useState } from 'react';
import { Codicon } from '@/components/ui/codicon';
import { useDiagramStore } from '@/store/diagram-store';
import { validateSchema } from '@/lib/validation/schema-validation';

interface BottomPanelProps {
  parseError: string | null;
  statusMessage: string;
  onClose: () => void;
}

export function BottomPanel({ parseError, statusMessage, onClose }: BottomPanelProps) {
  const ast = useDiagramStore((s) => s.ast);
  const setSelectedTable = useDiagramStore((s) => s.setSelectedTable);
  const issues = useMemo(() => validateSchema(ast), [ast]);
  const [tab, setTab] = useState<'problems' | 'output'>('problems');

  return (
    <section className="flex h-full flex-col bg-[var(--color-bg-editor)] text-[12px]">
      <div className="flex h-9 shrink-0 items-center border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-2">
        <button
          type="button"
          onClick={() => setTab('problems')}
          className={`h-8 px-2 text-[12px] ${
            tab === 'problems'
              ? 'border-b-2 border-[var(--color-text-primary)] text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          Problems
        </button>
        <button
          type="button"
          onClick={() => setTab('output')}
          className={`h-8 px-2 text-[12px] ${
            tab === 'output'
              ? 'border-b-2 border-[var(--color-text-primary)] text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          Output
        </button>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto flex h-6 w-6 items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
          aria-label="Close Panel"
        >
          <Codicon name="close" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[12px] leading-5">
        {tab === 'output' ? (
          <p className="text-[var(--color-text-secondary)]">{statusMessage}</p>
        ) : parseError ? (
          <p className="text-[var(--color-accent-danger)]">
            <Codicon name="error" className="mr-1" />
            {parseError}
          </p>
        ) : issues.length === 0 ? (
          <p className="text-[var(--color-text-muted)]">No problems have been detected.</p>
        ) : (
          issues.map((issue) => (
            <button
              key={issue.id}
              type="button"
              onClick={() => {
                if (issue.tableName) setSelectedTable(issue.tableName);
              }}
              className={`block w-full text-left ${
                issue.severity === 'error'
                  ? 'text-[var(--color-accent-danger)]'
                  : issue.severity === 'warning'
                    ? 'text-[var(--color-accent-warning)]'
                    : 'text-[var(--color-text-secondary)]'
              }`}
            >
              <Codicon
                name={
                  issue.severity === 'error'
                    ? 'error'
                    : issue.severity === 'warning'
                      ? 'warning'
                      : 'info'
                }
                className="mr-1"
              />
              {issue.tableName ? `${issue.tableName} — ` : ''}
              {issue.message}
            </button>
          ))
        )}
      </div>
    </section>
  );
}
