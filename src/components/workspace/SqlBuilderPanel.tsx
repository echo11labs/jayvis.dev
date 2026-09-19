'use client';

import { useState, useMemo, useCallback } from 'react';
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
import {
  Database,
  Play,
  Copy,
  Check,
  Download,
  Trash2,
  Terminal,
  CheckCircle2,
  XCircle,
  Loader2,
  Table2,
  ListTree,
} from 'lucide-react';
import { useDiagramStore } from '@/store/diagram-store';
import { buildSqlScript, buildSqlStatements } from '@/lib/export/ddl-sqlite';
import { useTheme } from '@/hooks/use-theme-state';
import { toast } from 'sonner';

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
  success: boolean;
  results: ExecuteResult[];
  summary: { total: number; succeeded: number; failed: number };
  error?: string;
}

/** Simple SQL syntax highlighter — wraps keywords, strings, comments in spans. */
function highlightSql(sql: string): string {
  const keywords = [
    'CREATE', 'TABLE', 'IF', 'NOT', 'EXISTS', 'PRIMARY', 'KEY', 'AUTOINCREMENT',
    'FOREIGN', 'REFERENCES', 'ON', 'DELETE', 'UPDATE', 'CASCADE', 'SET', 'NULL',
    'RESTRICT', 'NO', 'ACTION', 'UNIQUE', 'INDEX', 'INTEGER', 'TEXT', 'REAL',
    'BLOB', 'NUMERIC', 'BOOLEAN', 'DATETIME', 'DEFAULT', 'PRAGMA', 'FOREIGN_KEYS',
    'DROP', 'ALTER', 'ADD', 'CONSTRAINT', 'AND', 'OR',
  ];
  let highlighted = sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Comments
  highlighted = highlighted.replace(
    /(--[^\n]*)/g,
    '<span style="color:#6b7280">$1</span>',
  );

  // Strings
  highlighted = highlighted.replace(
    /('[^']*')/g,
    '<span style="color:#34d399">$1</span>',
  );

  // Keywords
  const kwRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
  highlighted = highlighted.replace(
    kwRegex,
    '<span style="color:#818cf8;font-weight:600">$1</span>',
  );

  // Numbers
  highlighted = highlighted.replace(
    /\b(\d+)\b/g,
    '<span style="color:#fbbf24">$1</span>',
  );

  return highlighted;
}

export function SqlBuilderPanel({ open, onOpenChange }: SqlBuilderPanelProps) {
  const ast = useDiagramStore((s) => s.ast);
  const theme = useTheme();
  const isDark = theme === 'dark';

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

  const statements = useMemo(() => buildSqlStatements(ast), [ast]);
  const sqlScript = useMemo(() => buildSqlScript(ast), [ast]);

  const sheetCls = isDark
    ? 'border-zinc-800 bg-zinc-950'
    : 'border-zinc-200 bg-white';
  const titleCls = isDark ? 'text-zinc-100' : 'text-zinc-900';
  const codeBg = isDark ? 'bg-zinc-900/80' : 'bg-zinc-50';
  const codeText = isDark ? 'text-zinc-300' : 'text-zinc-700';

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
      const data: ExecuteResponse = await res.json();

      setExecResults(data.results);
      setExecSummary(data.summary);
      if (!data.success && data.error) {
        setExecError(data.error);
      }

      if (data.success) {
        toast.success(
          `Built ${data.summary.succeeded} table(s) in the database`,
        );
      } else {
        toast.error(
          `Build failed: ${data.summary.failed} statement(s) failed`,
        );
      }
    } catch (err: any) {
      setExecError(err?.message || 'Network error');
      toast.error('Failed to execute SQL');
    } finally {
      setExecuting(false);
    }
  }, [statements]);

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

  const handleDropAll = useCallback(async () => {
    setExecuting(true);
    try {
      const res = await fetch('/api/build-sql', { method: 'DELETE' });
      const data = await res.json();
      toast.success(`Dropped ${data.count} table(s)`);
      setExistingTables(null);
    } catch (err: any) {
      toast.error('Failed to drop tables');
    } finally {
      setExecuting(false);
    }
  }, []);

  const handleCheckTables = useCallback(async () => {
    setCheckingTables(true);
    try {
      const res = await fetch('/api/build-sql');
      const data = await res.json();
      setExistingTables(data.tables || []);
    } catch {
      toast.error('Failed to check tables');
    } finally {
      setCheckingTables(false);
    }
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={`w-full p-0 sm:max-w-2xl ${sheetCls}`}
      >
        <SheetHeader className={`border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'} px-4 py-3`}>
          <SheetTitle className={`flex items-center gap-2 ${titleCls}`}>
            <Terminal className="h-4 w-4 text-emerald-400" />
            SQL Builder
          </SheetTitle>
          <SheetDescription className="text-zinc-500">
            Generate and execute CREATE TABLE statements from the canvas nodes
            against the local SQLite database.
          </SheetDescription>
        </SheetHeader>

        {/* Action bar */}
        <div className={`flex items-center gap-2 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'} px-4 py-2.5`}>
          <Button
            size="sm"
            onClick={handleExecute}
            disabled={executing || statements.length === 0}
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
          >
            {executing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Build Tables
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="gap-1.5"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copy SQL
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCheckTables}
              disabled={checkingTables}
              className="gap-1.5 text-zinc-400 hover:text-zinc-100"
            >
              {checkingTables ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Table2 className="h-3.5 w-3.5" />
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
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Drop All</span>
            </Button>
          </div>
        </div>

        {/* Summary badges */}
        <div className={`flex items-center gap-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'} px-4 py-2 text-[11px]`}>
          <Badge variant="outline" className="gap-1 border-zinc-600 text-zinc-400">
            <ListTree className="h-3 w-3" />
            {statements.length} statement(s)
          </Badge>
          <Badge variant="outline" className="gap-1 border-zinc-600 text-zinc-400">
            <Table2 className="h-3 w-3" />
            {Object.keys(ast.tables).length} table(s)
          </Badge>
          {execSummary && (
            <>
              <span className={`font-mono ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>·</span>
              <Badge
                variant="outline"
                className={`gap-1 ${execSummary.failed > 0 ? 'border-rose-500/30 text-rose-400' : 'border-emerald-500/30 text-emerald-400'}`}
              >
                {execSummary.failed > 0 ? (
                  <XCircle className="h-3 w-3" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {execSummary.succeeded}/{execSummary.total} executed
              </Badge>
            </>
          )}
        </div>

        <Tabs defaultValue="preview" className="flex flex-1 flex-col overflow-hidden">
          <TabsList className={`m-3 grid grid-cols-3 ${isDark ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
            <TabsTrigger
              value="preview"
              className={isDark ? 'data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100' : 'data-[state=active]:bg-white data-[state=active]:text-zinc-900'}
            >
              SQL Preview
            </TabsTrigger>
            <TabsTrigger
              value="results"
              className={isDark ? 'data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100' : 'data-[state=active]:bg-white data-[state=active]:text-zinc-900'}
            >
              Execution Results
            </TabsTrigger>
            <TabsTrigger
              value="tables"
              className={isDark ? 'data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100' : 'data-[state=active]:bg-white data-[state=active]:text-zinc-900'}
            >
              DB Tables
            </TabsTrigger>
          </TabsList>

          {/* SQL Preview tab */}
          <TabsContent value="preview" className="mt-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <pre className={`whitespace-pre-wrap break-words p-4 font-mono text-[12px] leading-relaxed ${codeBg} ${codeText}`}>
                <code dangerouslySetInnerHTML={{ __html: highlightSql(sqlScript) }} />
              </pre>
            </ScrollArea>
          </TabsContent>

          {/* Execution Results tab */}
          <TabsContent value="results" className="mt-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                {!execResults && !executing && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800/50">
                      <Terminal className="h-7 w-7 text-zinc-600" />
                    </div>
                    <p className="text-sm text-zinc-500">
                      No execution results yet. Click{' '}
                      <span className="font-mono text-emerald-400">Build Tables</span>{' '}
                      to execute the SQL.
                    </p>
                  </div>
                )}
                {executing && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                    <p className="text-sm text-zinc-500">Executing SQL statements…</p>
                  </div>
                )}
                {execError && (
                  <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
                    <div className="flex items-center gap-2 text-rose-400">
                      <XCircle className="h-4 w-4" />
                      <span className="text-xs font-semibold">Transaction Error</span>
                    </div>
                    <p className="mt-1 text-[11px] font-mono text-rose-300">{execError}</p>
                  </div>
                )}
                {execResults && execResults.map((r, i) => (
                  <div
                    key={i}
                    className={`mb-2 rounded-lg border p-3 ${
                      r.success
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : 'border-rose-500/20 bg-rose-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {r.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-400" />
                      )}
                      <span className="text-xs font-medium text-zinc-300">
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
                    <pre className={`mt-1.5 whitespace-pre-wrap font-mono text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
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
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800/50">
                      <Database className="h-7 w-7 text-zinc-600" />
                    </div>
                    <p className="text-sm text-zinc-500">
                      Click{' '}
                      <span className="font-mono text-indigo-400">Check DB</span>{' '}
                      to list tables in the database.
                    </p>
                  </div>
                )}
                {existingTables && existingTables.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800/50">
                      <Database className="h-7 w-7 text-zinc-600" />
                    </div>
                    <p className="text-sm text-zinc-500">
                      No StitchDB-managed tables found in the database.
                    </p>
                  </div>
                )}
                {existingTables && existingTables.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                      Tables in SQLite database ({existingTables.length})
                    </p>
                    {existingTables.map((name) => (
                      <div
                        key={name}
                        className={`mb-1.5 flex items-center gap-2 rounded-md border px-3 py-2 ${isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-zinc-50'}`}
                      >
                        <Table2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="font-mono text-xs text-zinc-300">{name}</span>
                        <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-500/60" />
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
