'use client';

import { useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Codicon } from '@/components/ui/codicon';
import type { IconName } from '@/lib/ui/icons';
import { useDiagramStore } from '@/store/diagram-store';
import {
  summarizeValidation,
  severityColor,
  severityBg,
  type ValidationIssue,
  type ValidationSeverity,
} from '@/lib/validation/schema-validation';

interface ValidationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_ICONS: Record<string, IconName> = {
  'primary-key': 'key',
  naming: 'hash',
  reference: 'link',
  type: 'type',
  index: 'shield',
};

type Filter = 'all' | ValidationSeverity;

function IssueRow({ issue }: { issue: ValidationIssue }) {
  const setSelectedTable = useDiagramStore((s) => s.setSelectedTable);
  const setSelectedEdge = useDiagramStore((s) => s.setSelectedEdge);
  const icon: IconName =
    issue.severity === 'error'
      ? 'error'
      : issue.severity === 'warning'
        ? 'warning'
        : 'info';
  const catIcon = CATEGORY_ICONS[issue.category];
  const selectable = Boolean(issue.refId || issue.tableName);

  return (
    <div
      className={`rounded-lg border p-3 ${severityBg(issue.severity)} ${selectable ? 'cursor-pointer' : ''}`}
      onClick={() => {
        if (issue.refId) setSelectedEdge(issue.refId);
        else if (issue.tableName) setSelectedTable(issue.tableName);
      }}
      role={selectable ? 'button' : undefined}
    >
      <div className="flex items-start gap-2.5">
        <Codicon
          name={icon}
          className={`mt-0.5 flex-shrink-0 ${severityColor(issue.severity)}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {catIcon && <Codicon name={catIcon} className="text-[var(--color-text-muted)]" />}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {issue.category}
            </span>
            {issue.tableName && (
              <span className="font-mono text-[10px] text-[var(--color-text-secondary)]">
                {issue.tableName}
                {issue.fieldName ? `.${issue.fieldName}` : ''}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-primary)]">{issue.message}</p>
          {issue.fix && (
            <p className="mt-1 text-[11px] italic text-[var(--color-text-muted)]">
              {issue.fix}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ValidationPanel({ open, onOpenChange }: ValidationPanelProps) {
  const ast = useDiagramStore((s) => s.ast);
  const [filter, setFilter] = useState<Filter>('all');

  const summary = useMemo(() => summarizeValidation(ast), [ast]);
  const filtered = useMemo(
    () =>
      filter === 'all'
        ? summary.issues
        : summary.issues.filter((issue) => issue.severity === filter),
    [summary.issues, filter],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-[var(--color-border-subtle)] px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-[var(--color-text-primary)]">
            <Codicon name="shield" />
            Schema Validation
          </SheetTitle>
          <SheetDescription className="text-[var(--color-text-muted)]">
            Checks for primary keys, naming, indexes, and relationship targets.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] px-4 py-2.5">
          <Badge
            variant="outline"
            className={`gap-1.5 border-[var(--color-accent-danger)]/30 ${summary.errors > 0 ? 'bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)]' : 'text-[var(--color-text-muted)]'}`}
          >
            <Codicon name="error" />
            {summary.errors} error{summary.errors !== 1 ? 's' : ''}
          </Badge>
          <Badge
            variant="outline"
            className={`gap-1.5 border-[var(--color-accent-warning)]/30 ${summary.warnings > 0 ? 'bg-[var(--color-accent-warning)]/10 text-[var(--color-accent-warning)]' : 'text-[var(--color-text-muted)]'}`}
          >
            <Codicon name="warning" />
            {summary.warnings} warning{summary.warnings !== 1 ? 's' : ''}
          </Badge>
          <div className="ml-auto flex gap-1">
            {(['all', 'error', 'warning', 'info'] as const).map((next) => (
              <button
                key={next}
                onClick={() => setFilter(next)}
                className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  filter === next
                    ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                {next}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="h-[calc(100%-140px)]">
          <div className="space-y-2 p-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Codicon name="pass" className="text-[var(--color-accent-success)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    No issues found
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    The schema passes all validation checks.
                  </p>
                </div>
              </div>
            ) : (
              filtered.map((issue) => (
                <IssueRow key={issue.id} issue={issue} />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
