'use client';

import { memo } from 'react';
import type { Node, NodeProps } from '@xyflow/react';

export interface TableGroupNodeData {
  name: string;
  tableCount: number;
  color?: string;
  [key: string]: unknown;
}

export type TableGroupNode = Node<TableGroupNodeData, 'tableGroup'>;

function TableGroupNodeComponent({ data }: NodeProps<TableGroupNode>) {
  const color = (data?.color as string) || 'var(--color-accent-primary)';

  return (
    <div className="pointer-events-none h-full w-full rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)]/30 font-mono shadow-sm transition-all">
      <div className="flex items-center gap-2 border-b border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-app)]/75 px-3.5 py-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--color-text-secondary)]">
          TableGroup {data.name}
        </span>
        <span className="ml-auto rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
          {data.tableCount} {data.tableCount === 1 ? 'table' : 'tables'}
        </span>
      </div>
    </div>
  );
}

export const TableGroupNode = memo(TableGroupNodeComponent);
TableGroupNode.displayName = 'TableGroupNode';
