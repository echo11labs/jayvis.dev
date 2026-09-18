'use client';

import { useMemo, useState } from 'react';
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
import { Copy, Check, ArrowUp, ArrowDown, Database, GitCompare } from 'lucide-react';
import { useDiagramStore } from '@/store/diagram-store';
import { SchemaDiffEngine } from '@/lib/diff/schema-diff';
import type { TableDiff, ColumnDiff } from '@/types/ast';
import { toast } from 'sonner';

interface MigrationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function actionColor(action: string) {
  switch (action) {
    case 'CREATE':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'DROP':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'ALTER':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  }
}

function columnActionColor(action: string) {
  switch (action) {
    case 'CREATE':
      return 'text-emerald-400';
    case 'DROP':
      return 'text-rose-400';
    case 'ALTER':
      return 'text-amber-400';
    default:
      return 'text-zinc-400';
  }
}

function SqlBlock({ lines, title }: { lines: string[]; title: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 1500);
  };

  const sql = lines.length > 0 ? lines.join('\n') : '-- no changes --';

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-300">{title}</span>
          <Badge variant="outline" className="border-zinc-700 text-[10px] text-zinc-400">
            {lines.length} stmt
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={copy}
          className="h-7 gap-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          Copy
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[12px] leading-relaxed text-zinc-300">
          <code>{sql}</code>
        </pre>
      </ScrollArea>
    </div>
  );
}

function DiffTree({ tables }: { tables: TableDiff[] }) {
  if (tables.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <GitCompare className="h-8 w-8 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-200">Schemas are identical</p>
          <p className="mt-1 text-xs text-zinc-500">
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
            className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-zinc-500" />
                <span className="font-mono text-xs font-medium text-zinc-200">
                  {td.tableName}
                </span>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] ${actionColor(td.action)}`}
              >
                {td.action}
              </Badge>
            </div>
            {td.columnDiffs.length > 0 && (
              <div className="divide-y divide-zinc-800/60">
                {td.columnDiffs.map((cd: ColumnDiff) => (
                  <div
                    key={`${cd.action}-${cd.columnName}`}
                    className="flex items-center justify-between px-3 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono font-bold ${columnActionColor(
                          cd.action,
                        )}`}
                      >
                        {cd.action === 'CREATE'
                          ? '+'
                          : cd.action === 'DROP'
                            ? '-'
                            : '~'}
                      </span>
                      <span className="font-mono text-zinc-300">
                        {cd.columnName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500">
                      {cd.oldField && (
                        <span className="line-through">{cd.oldField.type}</span>
                      )}
                      {cd.oldField && cd.newField && (
                        <span className="text-zinc-600">→</span>
                      )}
                      {cd.newField && (
                        <span className="text-zinc-300">{cd.newField.type}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export function MigrationPanel({ open, onOpenChange }: MigrationPanelProps) {
  const ast = useDiagramStore((s) => s.ast);
  const previousAST = useDiagramStore((s) => s.previousAST);

  const diff = useMemo(() => {
    if (!previousAST) return null;
    return SchemaDiffEngine.compare(previousAST, ast);
  }, [previousAST, ast]);

  const hasSnapshot = !!previousAST;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-zinc-800 bg-zinc-950 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-zinc-800 px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-zinc-100">
            <GitCompare className="h-4 w-4 text-indigo-400" />
            Migration Preview
          </SheetTitle>
          <SheetDescription className="text-zinc-500">
            {hasSnapshot
              ? 'Structural diff between the captured snapshot and the current schema.'
              : 'No snapshot captured yet. Click "Generate Migration" in the toolbar to capture a baseline.'}
          </SheetDescription>
        </SheetHeader>

        {!hasSnapshot || !diff ? (
          <div className="flex h-[calc(100%-100px)] flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800/50">
              <Database className="h-8 w-8 text-zinc-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-300">
                No baseline snapshot
              </p>
              <p className="mt-1 max-w-sm text-xs text-zinc-500">
                Use the <span className="font-mono text-indigo-400">Generate Migration</span>{' '}
                button to capture the current schema as a baseline, then make
                changes and reopen this panel to view the generated SQL.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-[calc(100%-100px)] flex-col">
            <div className="flex items-center gap-4 border-b border-zinc-800 px-4 py-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">Tables:</span>
                <span className="font-mono text-zinc-200">
                  {diff.tables.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">UP:</span>
                <span className="font-mono text-emerald-400">
                  {diff.upSql.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">DOWN:</span>
                <span className="font-mono text-rose-400">
                  {diff.downSql.length}
                </span>
              </div>
            </div>
            <Tabs defaultValue="diff" className="flex flex-1 flex-col overflow-hidden">
              <TabsList className="m-3 grid grid-cols-3 bg-zinc-900">
                <TabsTrigger
                  value="diff"
                  className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
                >
                  Diff Tree
                </TabsTrigger>
                <TabsTrigger
                  value="up"
                  className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
                >
                  <ArrowUp className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                  UP SQL
                </TabsTrigger>
                <TabsTrigger
                  value="down"
                  className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
                >
                  <ArrowDown className="mr-1.5 h-3.5 w-3.5 text-rose-400" />
                  DOWN SQL
                </TabsTrigger>
              </TabsList>
              <TabsContent value="diff" className="mt-0 flex-1 overflow-hidden">
                <DiffTree tables={diff.tables} />
              </TabsContent>
              <TabsContent value="up" className="mt-0 flex-1 overflow-hidden">
                <SqlBlock lines={diff.upSql} title="Forward Migration (up.sql)" />
              </TabsContent>
              <TabsContent value="down" className="mt-0 flex-1 overflow-hidden">
                <SqlBlock lines={diff.downSql} title="Rollback Migration (down.sql)" />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
