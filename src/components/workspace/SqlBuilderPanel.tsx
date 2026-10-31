'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import { generateMockSeedScript } from '@/lib/seeding/mock-data';
import { toast } from 'sonner';
import { confirmIf } from '@/lib/confirm-action';

interface SqlBuilderPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot?: string | null;
  initialTab?: string;
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

interface QueryResultData {
  columns: string[];
  rows: Record<string, unknown>[];
  count: number;
  durationMs: number;
  query: string;
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

export function SqlBuilderPanel({
  open,
  onOpenChange,
  slot,
  initialTab = 'preview',
}: SqlBuilderPanelProps) {
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
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (open && initialTab) {
      setTab(initialTab);
    }
  }, [open, initialTab]);

  // Seed Data State
  const [seedCount, setSeedCount] = useState<number>(5);
  const [seeding, setSeeding] = useState(false);

  // Query Runner State
  const firstTableName = Object.keys(ast.tables)[0] || '';
  const [queryInput, setQueryInput] = useState<string>(
    firstTableName ? `SELECT * FROM "${firstTableName}" LIMIT 10;` : 'SELECT 1 as test;',
  );
  const [queryRunning, setQueryRunning] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResultData | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const seedData = useMemo(
    () => generateMockSeedScript(ast, { count: seedCount, engine }),
    [ast, seedCount, engine],
  );

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

  const executeRef = useRef<((confirmDestructive?: boolean) => Promise<void>) | null>(null);

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
            void executeRef.current?.(true);
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

  useEffect(() => {
    executeRef.current = handleExecute;
  }, [handleExecute]);

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

  const handleSeedDatabase = useCallback(async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ast, count: seedCount, execute: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to seed database');
      }
      toast.success(`Seeded ${data.totalRows} records across ${data.tables.length} tables!`);
      void loadTables();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Seeding failed');
    } finally {
      setSeeding(false);
    }
  }, [ast, seedCount, loadTables]);

  const handleCopySeed = useCallback(() => {
    void navigator.clipboard.writeText(seedData.fullScript);
    toast.success('Copied seed SQL script to clipboard');
  }, [seedData.fullScript]);

  const handleDownloadSeed = useCallback(() => {
    const blob = new Blob([seedData.fullScript], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seed-${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded seed script');
  }, [seedData.fullScript]);

  const handleRunQuery = useCallback(async (customQuery?: string) => {
    const q = (customQuery ?? queryInput).trim();
    if (!q) return;
    setQueryRunning(true);
    setQueryError(null);
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setQueryError(data.error || 'Query failed');
        setQueryResult(null);
      } else {
        setQueryResult(data as QueryResultData);
      }
    } catch (err: unknown) {
      setQueryError(err instanceof Error ? err.message : 'Query execution failed');
      setQueryResult(null);
    } finally {
      setQueryRunning(false);
    }
  }, [queryInput]);

  const handleExportCsv = useCallback(() => {
    if (!queryResult || queryResult.rows.length === 0) return;
    const cols = queryResult.columns;
    const csvRows = [cols.join(',')];
    for (const r of queryResult.rows) {
      csvRows.push(
        cols
          .map((col) => {
            const val = r[col];
            if (val === null || val === undefined) return '';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(','),
      );
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported query results to CSV');
  }, [queryResult]);

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
            Build, seed, and query your database schema on {engineName}.
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
          <TabsList className="mx-3 mt-3 grid h-7 shrink-0 grid-cols-5 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] p-0.5">
            {[
              { id: 'preview', label: 'SQL DDL' },
              { id: 'seed', label: 'Mock Seed' },
              { id: 'query', label: 'Query Runner' },
              { id: 'results', label: 'Build Results' },
              { id: 'tables', label: 'DB Tables' },
            ].map((item) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                className="h-6 rounded-[var(--radius-sm)] text-[11px] font-medium shadow-none data-[state=active]:bg-[var(--color-bg-panel)] data-[state=active]:text-[var(--color-text-primary)]"
              >
                {item.label}
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

          {/* Seed Data tab */}
          <TabsContent value="seed" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-4 py-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[var(--color-text-muted)]">Rows / Table:</span>
                <div className="flex rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)]">
                  {[5, 10, 25].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setSeedCount(cnt)}
                      className={`px-2 py-0.5 font-mono text-[11px] ${
                        seedCount === cnt
                          ? 'bg-[var(--color-accent-primary)] text-white'
                          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
                <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
                  ({seedData.totalRows} total rows)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySeed}
                  className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-2 py-1 text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  Copy SQL
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSeed}
                  className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-2 py-1 text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  Download .sql
                </button>
                <button
                  type="button"
                  disabled={seeding || seedData.totalRows === 0}
                  onClick={() => void handleSeedDatabase()}
                  className="flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {seeding ? <Codicon name="loading" spin /> : <Codicon name="play" />}
                  Seed DB
                </button>
              </div>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <pre className={`whitespace-pre-wrap break-words p-4 font-mono text-[12px] leading-relaxed ${codeBg} ${codeText}`}>
                <code>{seedData.fullScript}</code>
              </pre>
            </ScrollArea>
          </TabsContent>

          {/* In-Studio Query Runner tab */}
          <TabsContent value="query" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 flex-col gap-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-3">
              {/* Quick table chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  Quick Query:
                </span>
                {(existingTables && existingTables.length > 0 ? existingTables : Object.keys(ast.tables)).map(
                  (tbl) => (
                    <button
                      key={tbl}
                      type="button"
                      onClick={() => {
                        const q = `SELECT * FROM "${tbl}" LIMIT 10;`;
                        setQueryInput(q);
                        void handleRunQuery(q);
                      }}
                      className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-2 py-0.5 font-mono text-[10px] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)] hover:text-[var(--color-text-primary)]"
                    >
                      {tbl}
                    </button>
                  ),
                )}
              </div>

              {/* SQL Input Textarea */}
              <div className="relative flex flex-col">
                <textarea
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      void handleRunQuery();
                    }
                  }}
                  placeholder="SELECT * FROM users LIMIT 10;"
                  rows={3}
                  className="w-full resize-y rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] p-2.5 font-mono text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)]"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    Press <kbd className="rounded bg-[var(--color-bg-app)] px-1 py-0.5 border border-[var(--color-border-subtle)]">⌘Enter</kbd> to execute
                  </span>
                  <div className="flex items-center gap-2">
                    {queryResult && queryResult.rows.length > 0 && (
                      <button
                        type="button"
                        onClick={handleExportCsv}
                        className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-2 py-1 text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      >
                        Export CSV
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={queryRunning || !queryInput.trim()}
                      onClick={() => void handleRunQuery()}
                      className="flex items-center gap-1 rounded bg-[var(--color-accent-primary)] px-3 py-1 text-[11px] font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                    >
                      {queryRunning ? <Codicon name="loading" spin /> : <Codicon name="play" />}
                      Run Query
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Query Results / Grid area */}
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-3">
                {queryError && (
                  <div className="mb-3 rounded border border-rose-500/30 bg-rose-500/10 p-3">
                    <div className="flex items-center gap-2 text-rose-400">
                      <Codicon name="error" />
                      <span className="text-xs font-semibold">Query Error</span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-rose-300">{queryError}</p>
                  </div>
                )}

                {!queryResult && !queryRunning && !queryError && (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <Codicon name="terminal" className="text-[var(--color-text-muted)]" />
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Type a SQL query above and click <span className="font-semibold text-[var(--color-text-primary)]">Run Query</span>.
                    </p>
                  </div>
                )}

                {queryRunning && (
                  <div className="flex flex-col items-center justify-center gap-2 py-12">
                    <Codicon name="loading" spin className="text-[var(--color-accent-primary)]" />
                    <p className="text-xs text-[var(--color-text-muted)]">Executing query…</p>
                  </div>
                )}

                {queryResult && (
                  <div>
                    <div className="mb-2 flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                      <span className="font-mono">
                        {queryResult.count} {queryResult.count === 1 ? 'row' : 'rows'} returned in {queryResult.durationMs}ms
                      </span>
                    </div>

                    {queryResult.columns.length > 0 && queryResult.rows.length > 0 ? (
                      <div className="overflow-x-auto rounded border border-[var(--color-border-subtle)]">
                        <table className="w-full text-left font-mono text-xs">
                          <thead className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)]">
                            <tr>
                              {queryResult.columns.map((col) => (
                                <th
                                  key={col}
                                  className="whitespace-nowrap px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)]"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-border-subtle)] bg-[var(--color-bg-app)]">
                            {queryResult.rows.map((row, idx) => (
                              <tr key={idx} className="hover:bg-[var(--color-bg-tertiary)]/50">
                                {queryResult.columns.map((col) => {
                                  const cell = row[col];
                                  return (
                                    <td
                                      key={col}
                                      className="whitespace-nowrap px-3 py-1.5 text-[11px] text-[var(--color-text-primary)]"
                                    >
                                      {cell === null ? (
                                        <span className="italic text-[var(--color-text-muted)]">NULL</span>
                                      ) : typeof cell === 'boolean' ? (
                                        <span className="text-amber-400">{cell ? 'true' : 'false'}</span>
                                      ) : typeof cell === 'number' ? (
                                        <span className="text-sky-400">{cell}</span>
                                      ) : (
                                        String(cell)
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="py-6 text-center text-xs text-[var(--color-text-muted)]">
                        Query executed successfully (0 rows returned).
                      </p>
                    )}
                  </div>
                )}
              </div>
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
