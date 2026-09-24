'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Codicon } from '@/components/ui/codicon';
import { useDiagramStore } from '@/store/diagram-store';
import { buildSqlScript, buildSqlStatements, type SqlStatement } from '@/lib/export/ddl-sqlite';
import { toast } from 'sonner';
import { confirmIf } from '@/lib/confirm-action';

interface SqlBuilderPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExecuteResult {
  statement: string;
  description: string;
  success: boolean;
  error?: string;
  rowsAffected?: number;
}

interface ExecuteResponse {
  success?: boolean;
  results?: ExecuteResult[];
  summary?: { total: number; succeeded: number; failed: number };
  error?: string;
  code?: string;
  tables?: string[];
  count?: number;
  script?: string;
  statements?: SqlStatement[];
}

async function readSqlResponse(res: Response): Promise<ExecuteResponse> {
  let data: ExecuteResponse | null = null;
  try {
    data = (await res.json()) as ExecuteResponse;
  } catch {
    data = null;
  }
  if (!res.ok || !data || data.error || data.success === false) {
    const suffix = data?.code ? ` (${data.code})` : '';
    throw new Error(
      `${data?.error || `SQL API returned ${res.status}`}${suffix}`,
    );
  }
  return data;
}

export function SqlBuilderPanel({ open, onOpenChange }: SqlBuilderPanelProps) {
  const ast = useDiagramStore((s) => s.ast);
  const [executing, setExecuting] = useState(false);
  const [execResults, setExecResults] = useState<ExecuteResult[] | null>(null);
  const [execSummary, setExecSummary] = useState<{
    total: number;
    succeeded: number;
    failed: number;
  } | null>(null);
  const [execError, setExecError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [existingTables, setExistingTables] = useState<string[] | null>(null);
  const [checkingTables, setCheckingTables] = useState(false);
  const [tab, setTab] = useState('preview');
  const [remoteScript, setRemoteScript] = useState<string | null>(null);
  const [remoteStatements, setRemoteStatements] = useState<SqlStatement[] | null>(null);

  const localStatements = useMemo(() => buildSqlStatements(ast), [ast]);
  const localScript = useMemo(() => buildSqlScript(ast), [ast]);
  const statements = remoteStatements ?? localStatements;
  const sqlScript = remoteScript ?? localScript;

  const loadTables = useCallback(async () => {
    setCheckingTables(true);
    try {
      const res = await fetch('/api/build-sql');
      const data = await readSqlResponse(res);
      setExistingTables(data.tables ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to check tables');
    } finally {
      setCheckingTables(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch('/api/build-sql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ast }),
          signal: controller.signal,
        });
        const data = await readSqlResponse(res);
        if (controller.signal.aborted || !data.script || !data.statements) return;
        setRemoteScript(data.script);
        setRemoteStatements(data.statements);
      } catch {
        if (!controller.signal.aborted) {
          setRemoteScript(null);
          setRemoteStatements(null);
        }
      }
    }, 200);
    void loadTables();
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, ast, loadTables]);

  const sheetCls = 'border-[var(--color-border-subtle)] bg-[var(--color-bg-app)]';
  const titleCls = 'text-[var(--color-text-primary)]';
  const codeBg = 'bg-[var(--color-bg-panel)]';
  const codeText = 'text-[var(--color-text-primary)]';

  const handleExecute = useCallback(async () => {
    setExecuting(true);
    setExecResults(null);
    setExecSummary(null);
    setExecError(null);

    try {
      const res = await fetch('/api/build-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statements }),
      });
      const data = await readSqlResponse(res);
      setExecResults(data.results ?? []);
      setExecSummary(
        data.summary ?? {
          total: data.results?.length ?? 0,
          succeeded: data.results?.filter((result) => result.success).length ?? 0,
          failed: data.results?.filter((result) => !result.success).length ?? 0,
        },
      );
      toast.success(
        `Built ${data.summary?.succeeded ?? data.results?.length ?? 0} table(s) in the database`,
      );
      setTab('results');
      void loadTables();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      setExecError(message);
      toast.error(message);
    } finally {
      setExecuting(false);
    }
  }, [loadTables, statements]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sqlScript);
      setCopied(true);
      toast.success('Copied SQL to clipboard');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Failed to copy');
    }
  }, [sqlScript]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([sqlScript], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'build.sql';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded build.sql');
  }, [sqlScript]);

  const dropAllTables = useCallback(async () => {
    setExecuting(true);
    try {
      const res = await fetch('/api/build-sql', { method: 'DELETE' });
      const data = await readSqlResponse(res);
      toast.success(`Dropped ${data.count ?? 0} table(s)`);
      setExistingTables([]);
      setTab('tables');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to drop tables');
    } finally {
      setExecuting(false);
    }
  }, []);

  const handleDropAll = useCallback(() => {
    confirmIf(true, {
      title: 'Drop all built tables?',
      description:
        'This permanently deletes JayVis.dev-managed tables in the local SQLite database. Prisma tables stay protected.',
      confirmLabel: 'Drop all',
      action: () => {
        void dropAllTables();
      },
    });
  }, [dropAllTables]);

  const handleCheckTables = useCallback(() => {
    setTab('tables');
    void loadTables();
  }, [loadTables]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={`w-full p-0 sm:max-w-2xl ${sheetCls}`}
      >
        <SheetHeader className={`border-b ${'border-[var(--color-border-subtle)]'} px-4 py-3`}>
          <SheetTitle className={`flex items-center gap-2 ${titleCls}`}>
            <Codicon name="terminal" />
            SQL Builder
          </SheetTitle>
          <SheetDescription className="text-[var(--color-text-muted)]">
            Generate and execute CREATE TABLE statements from the canvas nodes
            against the local SQLite database.
          </SheetDescription>
        </SheetHeader>

        {/* Action bar */}
        <div className={`flex items-center gap-2 border-b ${'border-[var(--color-border-subtle)]'} px-4 py-2.5`}>
          <Button
            size="sm"
            onClick={handleExecute}
            disabled={executing || statements.length === 0}
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
          >
            {executing ? (
              <Codicon name="loading" spin />
            ) : (
              <Codicon name="play" />
            )}
            Build Tables
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="gap-1.5"
          >
            {copied ? <Codicon name="check" /> : <Codicon name="copy" />}
            Copy SQL
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="gap-1.5"
          >
            <Codicon name="download" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCheckTables}
              disabled={checkingTables}
              className="gap-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              {checkingTables ? (
                <Codicon name="loading" spin />
              ) : (
                <Codicon name="table" />
              )}
              <span className="hidden sm:inline">Check DB</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDropAll}
              disabled={executing}
              className="gap-1.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <Codicon name="trash" />
              <span className="hidden sm:inline">Drop All</span>
            </Button>
          </div>
        </div>

        {/* Summary badges */}
        <div className={`flex items-center gap-3 border-b ${'border-[var(--color-border-subtle)]'} px-4 py-2 text-[11px]`}>
          <Badge variant="outline" className="gap-1 border-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
            <Codicon name="outline" />
            {statements.length} statement(s)
          </Badge>
          <Badge variant="outline" className="gap-1 border-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
            <Codicon name="table" />
            {Object.keys(ast.tables).length} table(s)
          </Badge>
          {execSummary && (
            <>
              <span className={`font-mono ${'text-[var(--color-text-muted)]'}`}>·</span>
              <Badge
                variant="outline"
                className={`gap-1 ${execSummary.failed > 0 ? 'border-rose-500/30 text-rose-400' : 'border-emerald-500/30 text-emerald-400'}`}
              >
                {execSummary.failed > 0 ? (
                  <Codicon name="error" />
                ) : (
                  <Codicon name="pass" />
                )}
                {execSummary.succeeded}/{execSummary.total} executed
              </Badge>
            </>
          )}
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col overflow-hidden">
          <TabsList className={`m-3 grid grid-cols-3 ${'bg-[var(--color-bg-panel)]'}`}>
            <TabsTrigger
              value="preview"
              className={'data-[state=active]:bg-[var(--color-bg-panel)] data-[state=active]:text-[var(--color-text-primary)]'}
            >
              SQL Preview
            </TabsTrigger>
            <TabsTrigger
              value="results"
              className={'data-[state=active]:bg-[var(--color-bg-panel)] data-[state=active]:text-[var(--color-text-primary)]'}
            >
              Execution Results
            </TabsTrigger>
            <TabsTrigger
              value="tables"
              className={'data-[state=active]:bg-[var(--color-bg-panel)] data-[state=active]:text-[var(--color-text-primary)]'}
            >
              DB Tables
            </TabsTrigger>
          </TabsList>

          {/* SQL Preview tab */}
          <TabsContent value="preview" className="mt-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <pre className={`whitespace-pre-wrap break-words p-4 font-mono text-[12px] leading-relaxed ${codeBg} ${codeText}`}>
                <code>{sqlScript || '-- empty schema --'}</code>
              </pre>
            </ScrollArea>
          </TabsContent>

          {/* Execution Results tab */}
          <TabsContent value="results" className="mt-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                {!execResults && !executing && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <Codicon name="terminal" className="text-[var(--color-text-muted)]" />
                    <p className="text-sm text-[var(--color-text-muted)]">
                      No execution results yet. Click{' '}
                      <span className="font-mono text-emerald-400">Build Tables</span>{' '}
                      to execute the SQL.
                    </p>
                  </div>
                )}
                {executing && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <Codicon name="loading" spin className="text-emerald-400" />
                    <p className="text-sm text-[var(--color-text-muted)]">Executing SQL statements…</p>
                  </div>
                )}
                {execError && (
                  <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
                    <div className="flex items-center gap-2 text-rose-400">
                      <Codicon name="error" />
                      <span className="text-xs font-semibold">Transaction Error</span>
                    </div>
                    <p className="mt-1 text-[11px] font-mono text-rose-300">{execError}</p>
                  </div>
                )}
                {execResults && execResults.map((r, i) => (
                  <div
                    key={i}
                    className={`mb-2 rounded-lg border p-3 ${r.success
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : 'border-rose-500/20 bg-rose-500/5'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      {r.success ? (
                        <Codicon name="pass" className="text-emerald-400" />
                      ) : (
                        <Codicon name="error" className="text-rose-400" />
                      )}
                      <span className="text-xs font-medium text-[var(--color-text-primary)]">
                        {r.description}
                      </span>
                      {r.rowsAffected !== undefined && r.rowsAffected >= 0 && (
                        <Badge variant="outline" className="ml-auto border-emerald-500/30 text-emerald-400 text-[10px]">
                          {r.rowsAffected} row(s)
                        </Badge>
                      )}
                    </div>
                    {!r.success && r.error && (
                      <p className="mt-1.5 text-[11px] font-mono text-rose-300">
                        {r.error}
                      </p>
                    )}
                    <pre className={`mt-1.5 whitespace-pre-wrap font-mono text-[10px] ${'text-[var(--color-text-muted)]'}`}>
                      {r.statement}
                    </pre>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* DB Tables tab */}
          <TabsContent value="tables" className="mt-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                {existingTables === null && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <Codicon name="database" className="text-[var(--color-text-muted)]" />
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Click{' '}
                      <span className="font-mono text-indigo-400">Check DB</span>{' '}
                      to list tables in the database.
                    </p>
                  </div>
                )}
                {existingTables && existingTables.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <Codicon name="database" className="text-[var(--color-text-muted)]" />
                    <p className="text-sm text-[var(--color-text-muted)]">
                      No JayVis.dev-managed tables found in the database.
                    </p>
                  </div>
                )}
                {existingTables && existingTables.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Tables in SQLite database ({existingTables.length})
                    </p>
                    {existingTables.map((name) => (
                      <div
                        key={name}
                        className={`mb-1.5 flex items-center gap-2 rounded-md border px-3 py-2 ${'border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)]'}`}
                      >
                        <Codicon name="table" />
                        <span className="font-mono text-xs text-[var(--color-text-primary)]">{name}</span>
                        <Codicon name="pass" className="ml-auto text-emerald-500/60" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
