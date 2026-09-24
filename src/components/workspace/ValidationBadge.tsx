'use client';

import { useMemo } from 'react';
import { Codicon } from '@/components/ui/codicon';
import type { IconName } from '@/lib/ui/icons';
import { useDiagramStore } from '@/store/diagram-store';
import { summarizeValidation } from '@/lib/validation/schema-validation';

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
  const { errors, warnings } = useMemo(() => summarizeValidation(ast), [ast]);

  const icon: IconName = errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'shield';
  const accent =
    errors > 0
      ? 'border-[var(--color-accent-danger)]/40 text-[var(--color-accent-danger)] hover:bg-[var(--color-accent-danger)]/10'
      : warnings > 0
        ? 'border-[var(--color-accent-warning)]/40 text-[var(--color-accent-warning)] hover:bg-[var(--color-accent-warning)]/10'
        : 'border-[var(--color-accent-success)]/30 text-[var(--color-accent-success)] hover:bg-[var(--color-accent-success)]/10';
  const badgeBg =
    errors > 0
      ? 'bg-[var(--color-accent-danger)] text-white'
      : warnings > 0
        ? 'bg-[var(--color-accent-warning)] text-[var(--color-bg-app)]'
        : '';

  const totalCount = errors + warnings;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded border bg-[var(--color-bg-panel)] px-1.5 py-0.5 text-[10px] transition-colors ${accent}`}
      title={`Validate schema (${errors} error${errors !== 1 ? 's' : ''}, ${warnings} warning${warnings !== 1 ? 's' : ''}) — ⌘⇧V`}
    >
      <Codicon name={icon} />
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
