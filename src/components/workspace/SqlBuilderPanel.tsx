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
import { Badge } from '@/components/ui/badge';
import { Codicon } from '@/components/ui/codicon';
import { useDiagramStore } from '@/store/diagram-store';
import { buildSchemaScript } from '@/lib/sql-script';
import { SQL_ENGINE_KEY, type SqlEngine } from '@/lib/sql-literal';
import { appendMigration, checksumText } from '@/lib/persistence';
import type { SqlStatement } from '@/lib/export/ddl-sqlite';
import { toast } from 'sonner';
import { confirmIf } from '@/lib/confirm-action';

interface SqlBuilderPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot?: string | null;
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

export function SqlBuilderPanel({ open, onOpenChange, slot }: SqlBuilderPanelProps) {
  const ast = useDiagramStore((s) => s.ast);
  const [engine, setEngine] = useState<SqlEngine>('sqlite');
  const [postgresReady, setPostgresReady] = useState(false);
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
  const built = useMemo(() => buildSchemaScript(ast, engine), [ast, engine]);
  const statements = built.statements;
  const sqlScript = built.script;
  const previewSql = useMemo(() => {
    const name = engine === 'postgres' ? 'PostgreSQL' : 'SQLite';
    const body = statements.map((statement) => statement.sql).join('\n\n');
    const pragma = engine === 'sqlite' ? 'PRAGMA foreign_keys = ON;\n\n' : '';
    return body
      ? `-- JayVis.dev — ${name} build\n${pragma}${body}\n`
      : '-- empty schema --';
  }, [engine, statements]);
  const storageNotes = useMemo(() => [...new Set(built.notes)], [built.notes]);

  const loadTables = useCallback(async () => {
    setCheckingTables(true);
    try {
      const res = await fetch('/api/build-sql');
      const data = await readSqlResponse(res);
      setExistingTables(data.tables ?? []);
      setPostgresReady(Boolean((data as { postgres?: boolean }).postgres));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to check tables');
    } finally {
      setCheckingTables(false);
    }
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(SQL_ENGINE_KEY);
    if (stored === 'postgres' || stored === 'sqlite') setEngine(stored);
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadTables();
  }, [open, loadTables]);

  const chooseEngine = (next: SqlEngine) => {
    setEngine(next);
    window.localStorage.setItem(SQL_ENGINE_KEY, next);
    window.dispatchEvent(new Event('jayvis-sql-engine'));
  };

  const sheetCls = 'border-[var(--color-border-subtle)] bg-[var(--color-bg-app)]';
  const titleCls = 'text-[var(--color-text-primary)]';
  const codeBg = 'bg-[var(--color-bg-panel)]';
  const codeText = 'text-[var(--color-text-primary)]';

  const handleExecute = useCallback(async (confirmDestructive = false) => {
    if (engine === 'postgres' && !postgresReady) {
      toast.error('Set POSTGRES_URL to build on PostgreSQL.');
      return;
    }
    setExecuting(true);
    setExecResults(null);
    setExecSummary(null);
    setExecError(null);

    try {
      const res = await fetch('/api/build-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ast, execute: true, engine, confirmDestructive }),
      });
      if (res.status === 409) {
        const pending = (await res.json()) as ExecuteResponse;
        setExecuting(false);
        confirmIf(true, {
          title: 'This build changes existing tables',
          description: pending.error || 'Columns or tables will be dropped or rewritten. A SQLite backup is written first.',
          confirmLabel: 'Apply build',
          action: () => {
            void handleExecute(true);
          },
        });
        return;
      }
      const data = await readSqlResponse(res);
      setExecResults(data.results ?? []);
      setExecSummary(
        data.summary ?? {
          total: data.results?.length ?? 0,
          succeeded: data.results?.filter((result) => result.success).length ?? 0,
          failed: data.results?.filter((result) => !result.success).length ?? 0,
        },
      );
      if (slot) {
        const up = (data.results ?? []).map((result) => result.statement).join('\n');
        appendMigration({
          slot,
          engine,
          up,
          down: '-- rebuild from the current schema',
          checksum: checksumText(up),
          appliedAt: Date.now(),
          ok: true,
        });
      }
      toast.success(
        `Built ${data.summary?.succeeded ?? data.results?.length ?? 0} statement(s)`,
      );
      setTab('results');
      void loadTables();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      setExecError(message);
      if (slot) {
        appendMigration({
          slot,
          engine,
          up: sqlScript,
          down: '',
          checksum: checksumText(sqlScript),
          appliedAt: Date.now(),
          ok: false,
          error: message,
        });
      }
      toast.error(message);
    } finally {
      setExecuting(false);
    }
  }, [ast, engine, loadTables, postgresReady, slot, sqlScript]);

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

  const engineName = engine === 'postgres' ? 'PostgreSQL' : 'SQLite';
  const control =
    'inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-md)] px-2 text-[12px] disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={`flex h-full w-full max-w-[100vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl lg:max-w-2xl ${sheetCls}`}
      >
        <SheetHeader className="shrink-0 border-b border-[var(--color-border-subtle)] px-4 py-3 pr-10">
          <SheetTitle className={`flex items-center gap-2 text-sm ${titleCls}`}>
            <Codicon name="terminal" />
            SQL Builder
          </SheetTitle>
          <SheetDescription className="text-pretty text-[12px] leading-5 text-[var(--color-text-muted)]">
            Build the current schema on {engineName}.
            {!postgresReady ? ' PostgreSQL stays off until POSTGRES_URL is set.' : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--color-border-subtle)] px-4 py-2.5">
          <div
            role="group"
            aria-label="Database engine"
            className="inline-flex h-7 items-center rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-0.5"
          >
            {(['sqlite', 'postgres'] as const).map((choice) => {
              const disabled = choice === 'postgres' && !postgresReady;
              const selected = engine === choice;
              return (
                <button
                  key={choice}
                  type="button"
                  disabled={disabled}
                  title={disabled ? 'Set POSTGRES_URL to enable PostgreSQL' : undefined}
                  onClick={() => chooseEngine(choice)}
                  className={`h-6 rounded-[var(--radius-sm)] px-2 text-[12px] disabled:cursor-not-allowed disabled:opacity-40 ${
                    selected
                      ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {choice === 'sqlite' ? 'SQLite' : 'PostgreSQL'}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => void handleExecute(false)}
            disabled={executing || statements.length === 0 || (engine === 'postgres' && !postgresReady)}
            className={`${control} bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-accent-hover)]`}
          >
            {executing ? <Codicon name="loading" spin /> : <Codicon name="play" />}
            Build Tables
          </button>
          <button type="button" onClick={handleCopy} className={`${control} text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]`}>
            {copied ? <Codicon name="check" /> : <Codicon name="copy" />}
            Copy
          </button>
          <button type="button" onClick={handleDownload} className={`${control} text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]`}>
            <Codicon name="download" />
            Download
          </button>
          <button
            type="button"
            onClick={handleCheckTables}
            disabled={checkingTables}
            className={`${control} text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]`}
          >
            {checkingTables ? <Codicon name="loading" spin /> : <Codicon name="table" />}
            Check DB
          </button>
          <button
            type="button"
            onClick={handleDropAll}
            disabled={executing}
            className={`${control} text-[var(--color-accent-danger)] hover:bg-[var(--color-bg-tertiary)]`}
          >
            <Codicon name="trash" />
            Drop All
          </button>
        </div>

        {/* Summary badges */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--color-border-subtle)] px-4 py-2 text-[11px]">
          <Badge variant="outline" className="h-6 gap-1 rounded-[var(--radius-sm)] border-[var(--color-border-subtle)] px-2 font-normal text-[11px] text-[var(--color-text-muted)]">
            <Codicon name="outline" />
            {statements.length} statement(s)
          </Badge>
          <Badge variant="outline" className="h-6 gap-1 rounded-[var(--radius-sm)] border-[var(--color-border-subtle)] px-2 font-normal text-[11px] text-[var(--color-text-muted)]">
            <Codicon name="table" />
            {Object.keys(ast.tables).length} table(s)
          </Badge>
          {execSummary && (
            <Badge
              variant="outline"
              className={`h-6 gap-1 rounded-[var(--radius-sm)] border-[var(--color-border-subtle)] px-2 font-normal text-[11px] ${
                execSummary.failed > 0
                  ? 'text-[var(--color-accent-danger)]'
                  : 'text-[var(--color-accent-success)]'
              }`}
            >
              {execSummary.failed > 0 ? <Codicon name="error" /> : <Codicon name="pass" />}
              {execSummary.succeeded}/{execSummary.total} executed
            </Badge>
          )}
        </div>

        {storageNotes.length > 0 && (
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border-subtle)] px-4 py-1.5">
            <p className="shrink-0 text-[10px] text-[var(--color-text-muted)]">{engineName} storage</p>
            <ul className="flex min-w-0 gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {storageNotes.map((note) => (
                <li
                  key={note}
                  className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-2 py-0.5 font-mono text-[10px] text-[var(--color-text-secondary)]"
                >
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab} className="flex h-0 min-h-0 w-full flex-1 flex-col gap-0 overflow-hidden">
          <TabsList className="mx-3 mt-3 grid h-7 shrink-0 grid-cols-3 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] p-0.5">
            {['preview', 'results', 'tables'].map((value) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-6 rounded-[var(--radius-sm)] text-[12px] shadow-none data-[state=active]:bg-[var(--color-bg-panel)] data-[state=active]:text-[var(--color-text-primary)]"
              >
                {value === 'preview' ? 'SQL Preview' : value === 'results' ? 'Results' : 'DB Tables'}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="preview" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="min-h-0 flex-1">
              <pre className={`whitespace-pre-wrap break-words p-4 font-mono text-[12px] leading-relaxed ${codeBg} ${codeText}`}>
                <code>{previewSql}</code>
              </pre>
            </ScrollArea>
          </TabsContent>

          {/* Execution Results tab */}
          <TabsContent value="results" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-4">
                {!execResults && !executing && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <Codicon name="terminal" className="text-[var(--color-text-muted)]" />
                    <p className="text-sm text-[var(--color-text-muted)]">
                      No execution results yet. Click{' '}
                      <span className="font-mono text-[var(--color-text-primary)]">Build Tables</span>{' '}
                      to execute the SQL.
                    </p>
                  </div>
                )}
                {executing && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <Codicon name="loading" spin className="text-[var(--color-accent-primary)]" />
                    <p className="text-sm text-[var(--color-text-muted)]">Executing SQL statements…</p>
                  </div>
                )}
                {execError && (
                  <div className="mb-3 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-3">
                    <div className="flex items-center gap-2 text-[var(--color-accent-danger)]">
                      <Codicon name="error" />
                      <span className="text-xs font-semibold">Transaction error</span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-[var(--color-text-secondary)]">{execError}</p>
                  </div>
                )}
                {execResults && execResults.map((r, i) => (
                  <div
                    key={i}
                    className="mb-2 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-3"
                  >
                    <div className="flex items-center gap-2">
                      {r.success ? (
                        <Codicon name="pass" className="text-[var(--color-accent-success)]" />
                      ) : (
                        <Codicon name="error" className="text-[var(--color-accent-danger)]" />
                      )}
                      <span className="text-xs font-medium text-[var(--color-text-primary)]">
                        {r.description}
                      </span>
                      {r.rowsAffected !== undefined && r.rowsAffected >= 0 && (
                        <Badge variant="outline" className="ml-auto border-[var(--color-border-subtle)] text-[10px] text-[var(--color-accent-success)]">
                          {r.rowsAffected} row(s)
                        </Badge>
                      )}
                    </div>
                    {!r.success && r.error && (
                      <p className="mt-1.5 font-mono text-[11px] text-[var(--color-accent-danger)]">
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
          <TabsContent value="tables" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-4">
                {existingTables === null && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <Codicon name="database" className="text-[var(--color-text-muted)]" />
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Click{' '}
                      <span className="font-mono text-[var(--color-text-primary)]">Check DB</span>{' '}
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
                      Tables in {engineName} ({existingTables.length})
                    </p>
                    {existingTables.map((name) => (
                      <div
                        key={name}
                        className={`mb-1.5 flex items-center gap-2 rounded-md border px-3 py-2 ${'border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)]'}`}
                      >
                        <Codicon name="table" />
                        <span className="font-mono text-xs text-[var(--color-text-primary)]">{name}</span>
                        <Codicon name="pass" className="ml-auto text-[var(--color-accent-success)]" />
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
