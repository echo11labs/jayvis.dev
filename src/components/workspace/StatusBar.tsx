'use client';

import { useEffect, useState } from 'react';
import type { SyncStatus } from '@/types/ast';

interface StatusBarProps {
  syncStatus: SyncStatus;
  isParsing: boolean;
  parseError: string | null;
  statusMessage: string;
  validationErrors: number;
  validationWarnings: number;
  tableCount: number;
  relationCount: number;
  showCursor: boolean;
  problemCount?: number;
  migrationCount?: number;
  onOpenProblems: () => void;
  onOpenMigration?: () => void;
  onOpenSql?: () => void;
  onRetryParse: () => void;
}

export function StatusBar({
  syncStatus,
  isParsing,
  parseError,
  statusMessage,
  tableCount,
  relationCount,
  showCursor,
  problemCount = 0,
  migrationCount = 0,
  onOpenProblems,
  onOpenMigration,
  onOpenSql,
  onRetryParse,
}: StatusBarProps) {
  const [cursor, setCursor] = useState({ line: 1, col: 1 });

  useEffect(() => {
    const onCursor = (event: Event) => {
      const detail = (event as CustomEvent<{ line: number; col: number }>).detail;
      if (!detail) return;
      setCursor(detail);
    };
    window.addEventListener('jayvis:editor-cursor', onCursor);
    return () => window.removeEventListener('jayvis:editor-cursor', onCursor);
  }, []);

  const parsing = syncStatus === 'parsing' || isParsing;
  const offline = syncStatus === 'offline';
  const invalid = syncStatus === 'invalid' || !!parseError;

  const readyLabel = parsing
    ? 'Parsing'
    : offline
      ? 'Offline'
      : invalid
        ? 'Parse error'
        : 'Ready';
  const readyTone = parsing
    ? 'text-[var(--color-text-muted)]'
    : offline || invalid
      ? 'text-[var(--color-accent-danger)]'
      : 'text-[var(--color-accent-success)]';

  return (
    <footer
      className="flex h-9 shrink-0 items-stretch border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] text-[var(--color-text-muted)]"
      aria-label="Status"
    >
      <div role="group" aria-label="Workspace status" className="flex items-stretch gap-1 px-2 text-[12px]">
      <button
        type="button"
        onClick={invalid || offline ? onRetryParse : onOpenProblems}
        className={`flex items-center gap-2 px-3 font-medium hover:text-[var(--color-text-primary)] ${readyTone}`}
        title={statusMessage}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            parsing
              ? 'bg-[var(--color-text-muted)]'
              : offline || invalid
                ? 'bg-[var(--color-accent-danger)]'
                : 'bg-[var(--color-accent-success)]'
          }`}
        />
        {readyLabel}
      </button>
      <button type="button" onClick={onOpenProblems} className="px-3 font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
        Problems{problemCount > 0 ? ` ${problemCount}` : ''}
      </button>
      </div>
      {(onOpenMigration || onOpenSql) && (
        <div role="group" aria-label="Schema actions" className="flex items-stretch gap-1 border-l border-[var(--color-border-default)] px-3 text-[11px]">
          {onOpenMigration && (
            <button type="button" onClick={onOpenMigration} className="px-3 hover:text-[var(--color-text-primary)]">
              Migration{migrationCount > 0 ? ` ${migrationCount}` : ''}
            </button>
          )}
          {onOpenSql && (
            <button type="button" onClick={onOpenSql} className="px-3 hover:text-[var(--color-text-primary)]">
              SQL
            </button>
          )}
        </div>
      )}
      <div role="group" aria-label="Schema size" className="ml-auto flex items-center gap-4 border-l border-[var(--color-border-default)] px-4 text-[10px] tracking-wide">
        <span>
          {tableCount} {tableCount === 1 ? 'table' : 'tables'}
          <span className="mx-2 text-[var(--color-border-default)]">·</span>
          {relationCount} {relationCount === 1 ? 'relation' : 'relations'}
        </span>
        {showCursor && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('jayvis:editor-goto'))}
            className="border-l border-[var(--color-border-default)] pl-4 font-mono hover:text-[var(--color-text-primary)]"
            title="Go to line"
          >
            L {cursor.line} C {cursor.col}
          </button>
        )}
      </div>
    </footer>
  );
}
