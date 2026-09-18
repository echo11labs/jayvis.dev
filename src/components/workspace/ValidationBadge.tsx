'use client';

import { useMemo } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { useDiagramStore } from '@/store/diagram-store';
import { validateSchema } from '@/lib/validation/schema-validation';

interface ValidationBadgeProps {
  onClick: () => void;
}

/**
 * Validate button with a live error/warning count badge.
 * Icon + badge color reflect the schema health:
 *   - no issues → green shield
 *   - only warnings → amber shield
 *   - any errors → red shield
 */
export function ValidationBadge({ onClick }: ValidationBadgeProps) {
  const ast = useDiagramStore((s) => s.ast);
  const issues = useMemo(() => validateSchema(ast), [ast]);
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  const Icon = errorCount > 0 ? ShieldX : warningCount > 0 ? ShieldAlert : ShieldCheck;
  const accent =
    errorCount > 0
      ? 'border-rose-500/40 text-rose-400 hover:bg-rose-500/10'
      : warningCount > 0
        ? 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10'
        : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10';
  const badgeBg =
    errorCount > 0
      ? 'bg-rose-500 text-white'
      : warningCount > 0
        ? 'bg-amber-500 text-zinc-950'
        : '';

  const totalCount = errorCount + warningCount;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded border bg-zinc-900/60 px-1.5 py-0.5 text-[10px] transition-colors ${accent}`}
      title={`Validate schema (${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warningCount} warning${warningCount !== 1 ? 's' : ''}) — ⌘⇧V`}
    >
      <Icon className="h-3 w-3" />
      <span className="hidden sm:inline">Validate</span>
      {totalCount > 0 && (
        <span
          className={`ml-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${badgeBg}`}
        >
          {totalCount}
        </span>
      )}
    </button>
  );
}
