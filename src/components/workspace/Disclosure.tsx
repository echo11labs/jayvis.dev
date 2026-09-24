'use client';

import type { ReactNode } from 'react';
import { Mark } from '@/lib/ui/marks';

export function Disclosure({
  label,
  count,
  detail,
  open,
  onOpenChange,
  action,
  children,
}: {
  label: string;
  count?: number;
  detail?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-[var(--color-border-subtle)]">
      <div className="flex h-9 items-center pr-1">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
          className="flex h-9 min-w-0 flex-1 items-center gap-1.5 px-2.5 text-left hover:bg-[var(--color-bg-tertiary)]"
        >
          <Mark
            name={open ? 'chevronDown' : 'chevronRight'}
            className="shrink-0 text-[var(--color-text-muted)]"
          />
          <span className="text-[11px] tracking-wide text-[var(--color-text-secondary)]">{label}</span>
          {typeof count === 'number' && (
            <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{count}</span>
          )}
          {detail && (
            <span className="ml-auto truncate pl-3 font-mono text-[10px] text-[var(--color-text-muted)]">
              {detail}
            </span>
          )}
        </button>
        {action}
      </div>
      {open && <div className="px-1 pb-2">{children}</div>}
    </section>
  );
}
