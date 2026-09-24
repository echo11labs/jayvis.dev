'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Codicon } from '@/components/ui/codicon';
import { useDiagramStore } from '@/store/diagram-store';
import { buildMigration, readBaseline, writeBaseline, type MigrationResult } from '@/lib/migrations';
import type {
  TableDiff,
  ColumnDiff,
  IndexDiff,
  ReferenceDiff,
} from '@/types/ast';
import { toast } from 'sonner';
import { confirmIf } from '@/lib/confirm-action';

interface MigrationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: string | null;
}

function actionColor(action: string) {
  switch (action) {
    case 'CREATE':
      return 'bg-[var(--color-accent-success)]/10 text-[var(--color-accent-success)] border-[var(--color-accent-success)]/20';
    case 'DROP':
      return 'bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)] border-[var(--color-accent-danger)]/20';
    case 'ALTER':
      return 'bg-[var(--color-accent-warning)]/10 text-[var(--color-accent-warning)] border-[var(--color-accent-warning)]/20';
    default:
      return 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]';
  }
}

function columnActionColor(action: string) {
  switch (action) {
    case 'CREATE':
      return 'text-[var(--color-accent-success)]';
    case 'DROP':
      return 'text-[var(--color-accent-danger)]';
    case 'ALTER':
      return 'text-[var(--color-accent-warning)]';
    default:
      return 'text-[var(--color-text-muted)]';
  }
}

function downloadSql(filename: string, lines: string[]) {
  const blob = new Blob([lines.join('\n') || '-- no changes --'], {
    type: 'text/sql',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function SqlBlock({ lines, title, filename }: { lines: string[]; title: string; filename: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(lines.join('\n') || '-- no changes --');
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 1500);
  };

  const sql = lines.length > 0 ? lines.join('\n') : '-- no changes --';

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">{title}</span>
          <Badge variant="outline" className="border-[var(--color-border-subtle)] text-[10px] text-[var(--color-text-muted)]">
            {lines.filter((line) => !line.startsWith('--')).length} stmt
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              downloadSql(filename, lines);
              toast.success(`Downloaded ${filename}`);
            }}
            className="h-7 gap-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            <Codicon name="download" />
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={copy}
            className="h-7 gap-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            {copied ? (
              <Codicon name="check" />
            ) : (
              <Codicon name="copy" />
            )}
            Copy
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[12px] leading-relaxed text-[var(--color-text-primary)]">
          <code>{sql}</code>
        </pre>
      </ScrollArea>
    </div>
  );
}

function DiffTree({
  tables,
  indexes,
  references,
}: {
  tables: TableDiff[];
  indexes: IndexDiff[];
  references: ReferenceDiff[];
}) {
  const setSelectedTable = useDiagramStore((s) => s.setSelectedTable);
  const setSelectedEdge = useDiagramStore((s) => s.setSelectedEdge);

  if (tables.length === 0 && indexes.length === 0 && references.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <Codicon name="diff" className="text-[var(--color-accent-success)]" />
        <div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">Schemas are identical</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            No structural changes detected between the snapshot and the current schema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-4">
        {tables.map((td) => (
          <div
            key={`${td.action}-${td.tableName}`}
            className="overflow-hidden rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)]"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-[var(--color-border-subtle)] px-3 py-2 text-left"
              onClick={() => setSelectedTable(td.tableName)}
            >
              <div className="flex items-center gap-2">
                <Codicon name="database" className="text-[var(--color-text-muted)]" />
                <span className="font-mono text-xs font-medium text-[var(--color-text-primary)]">
                  {td.tableName}
                </span>
              </div>
              <Badge variant="outline" className={`text-[10px] ${actionColor(td.action)}`}>
                {td.action}
              </Badge>
            </button>
            {td.columnDiffs.length > 0 && (
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {td.columnDiffs.map((cd: ColumnDiff) => (
                  <div
                    key={`${cd.action}-${cd.columnName}`}
                    className="flex items-center justify-between px-3 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold ${columnActionColor(cd.action)}`}>
                        {cd.action === 'CREATE' ? '+' : cd.action === 'DROP' ? '-' : '~'}
                      </span>
                      <span className="font-mono text-[var(--color-text-primary)]">
                        {cd.columnName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--color-text-muted)]">
                      {cd.oldField && (
                        <span className="line-through">{cd.oldField.type}</span>
                      )}
                      {cd.oldField && cd.newField && <span>→</span>}
                      {cd.newField && <span>{cd.newField.type}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {indexes.map((idx) => (
          <button
            type="button"
            key={`${idx.action}-${idx.tableName}-${idx.indexName}`}
            className="flex w-full items-center justify-between rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-3 py-2 text-left"
            onClick={() => setSelectedTable(idx.tableName)}
          >
            <div className="flex min-w-0 items-center gap-2">
              <Codicon name="hash" className="text-[var(--color-text-muted)]" />
              <span className="truncate font-mono text-xs text-[var(--color-text-primary)]">
                {idx.indexName}
              </span>
              <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                {idx.tableName} ({idx.columns.join(', ')})
              </span>
            </div>
            <Badge variant="outline" className={`text-[10px] ${actionColor(idx.action)}`}>
              INDEX {idx.action}
            </Badge>
          </button>
        ))}

        {references.map((change) => {
          const { current: nextRef, previous: prevRef, action, refId } = change;
          const edge = nextRef ?? prevRef;
          return (
            <button
              type="button"
              key={`${action}-${refId}`}
              className="flex w-full items-center justify-between rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-3 py-2 text-left"
              onClick={() => {
                if (nextRef) setSelectedEdge(nextRef.id);
                else if (prevRef) setSelectedTable(prevRef.sourceTable);
              }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <Codicon name="link" className="text-[var(--color-text-muted)]" />
                <span className="truncate font-mono text-xs text-[var(--color-text-primary)]">
                  {edge
                    ? `${edge.sourceTable}.${edge.sourceField} → ${edge.targetTable}.${edge.targetField}`
                    : refId}
                </span>
              </div>
              <Badge variant="outline" className={`text-[10px] ${actionColor(action)}`}>
                REF {action}
              </Badge>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export function MigrationPanel({ open, onOpenChange, slot }: MigrationPanelProps) {
  const ast = useDiagramStore((s) => s.ast);
  const captureSnapshot = useDiagramStore((s) => s.captureSnapshot);
  const setPreviousAST = useDiagramStore((s) => s.setPreviousAST);
  const [revision, setRevision] = useState(0);
  const [remote, setRemote] = useState<MigrationResult | null>(null);

  const baseline = useMemo(() => (slot ? readBaseline(slot) : null), [slot, revision]);
  const local = useMemo(() => buildMigration(baseline, ast), [baseline, ast]);
  const result = remote ?? local;
  const { diff, summary, hasBaseline } = result;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setRemote(null);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch('/api/migrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseline, current: ast }),
          signal: controller.signal,
        });
        const body = await res.json();
        if (controller.signal.aborted) return;
        if (!res.ok || !body?.diff || !body?.summary) return;
        setRemote({
          hasBaseline: Boolean(body.hasBaseline),
          diff: body.diff,
          summary: body.summary,
        });
      } catch {
        if (!controller.signal.aborted) setRemote(null);
      }
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, ast, baseline]);

  const saveBaseline = () => {
    captureSnapshot();
    if (slot) writeBaseline(slot, ast);
    setPreviousAST(ast);
    setRemote(null);
    setRevision((current) => current + 1);
    toast.success('Baseline saved');
  };

  const recapture = () => {
    const hasChanges = summary.tables + summary.indexes + summary.references > 0;
    confirmIf(hasBaseline && hasChanges, {
      title: 'Recapture baseline?',
      description: 'This replaces the saved snapshot. Generated SQL will reset until you change the schema again.',
      confirmLabel: 'Recapture',
      action: saveBaseline,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-[var(--color-border-subtle)] px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-[var(--color-text-primary)]">
            <Codicon name="diff" />
            Migration Preview
          </SheetTitle>
          <SheetDescription className="text-[var(--color-text-muted)]">
            {hasBaseline
              ? 'PostgreSQL diff between the saved baseline and the current schema.'
              : 'No baseline saved. This migration creates the current schema.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex h-[calc(100%-100px)] flex-col">
            <div className="flex items-center gap-4 border-b border-[var(--color-border-subtle)] px-4 py-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--color-text-muted)]">Tables:</span>
                <span className="font-mono text-[var(--color-text-primary)]">{summary.tables}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--color-text-muted)]">Indexes:</span>
                <span className="font-mono text-[var(--color-text-primary)]">{summary.indexes}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--color-text-muted)]">Refs:</span>
                <span className="font-mono text-[var(--color-text-primary)]">{summary.references}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--color-text-muted)]">UP:</span>
                <span className="font-mono text-[var(--color-accent-success)]">{summary.up}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--color-text-muted)]">DOWN:</span>
                <span className="font-mono text-[var(--color-accent-danger)]">{summary.down}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={hasBaseline ? recapture : saveBaseline}
                className="ml-auto h-7 gap-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
              >
                <Codicon name="camera" />
                {hasBaseline ? 'Recapture' : 'Save baseline'}
              </Button>
            </div>
            <Tabs defaultValue="diff" className="flex flex-1 flex-col overflow-hidden">
              <TabsList className="m-3 grid grid-cols-3 bg-[var(--color-bg-tertiary)]">
                <TabsTrigger
                  value="diff"
                  className="data-[state=active]:bg-[var(--color-bg-panel)] data-[state=active]:text-[var(--color-text-primary)]"
                >
                  Diff Tree
                </TabsTrigger>
                <TabsTrigger
                  value="up"
                  className="data-[state=active]:bg-[var(--color-bg-panel)] data-[state=active]:text-[var(--color-text-primary)]"
                >
                  <Codicon name="arrowUp" className="mr-1.5 text-[var(--color-accent-success)]" />
                  UP SQL
                </TabsTrigger>
                <TabsTrigger
                  value="down"
                  className="data-[state=active]:bg-[var(--color-bg-panel)] data-[state=active]:text-[var(--color-text-primary)]"
                >
                  <Codicon name="arrowDown" className="mr-1.5 text-[var(--color-accent-danger)]" />
                  DOWN SQL
                </TabsTrigger>
              </TabsList>
              <TabsContent value="diff" className="mt-0 flex-1 overflow-hidden">
                <DiffTree
                  tables={diff.tables}
                  indexes={diff.indexes}
                  references={diff.references}
                />
              </TabsContent>
              <TabsContent value="up" className="mt-0 flex-1 overflow-hidden">
                <SqlBlock lines={diff.upSql} title="Forward Migration (up.sql)" filename="up.sql" />
              </TabsContent>
              <TabsContent value="down" className="mt-0 flex-1 overflow-hidden">
                <SqlBlock lines={diff.downSql} title="Rollback Migration (down.sql)" filename="down.sql" />
              </TabsContent>
            </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
