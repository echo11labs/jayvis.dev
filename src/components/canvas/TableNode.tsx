'use client';

import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { SchemaTable, SchemaField } from '@/types/ast';
import type { ValidationSeverity } from '@/lib/validation/schema-validation';
import { Mark } from '@/lib/ui/marks';

export interface TableNodeData {
  table: SchemaTable;
  issueSeverity?: ValidationSeverity | null;
  fkFields?: string[];
  [key: string]: unknown;
}

export type TableNode = Node<TableNodeData, string>;

function TableNodeComponent({ id, data, selected }: NodeProps<TableNode>) {
  const table = data.table;
  const pkCount = table.fields.filter((f) => f.constraints.isPrimaryKey).length;
  const issueSeverity = data.issueSeverity ?? null;
  const fkFields = new Set(data.fkFields ?? []);

  return (
    <div
      className={`min-w-[300px] border bg-[var(--color-bg-panel)] font-mono shadow-sm ${
        selected
          ? 'border-[var(--color-accent-primary)]'
          : 'border-[var(--color-border-subtle)]'
      }`}
    >
      <div className="flex items-center gap-2.5 border-b border-[var(--color-border-subtle)] px-3.5 py-2.5">
        <Mark name="table" className="text-[var(--color-text-muted)]" />
        <span className="truncate text-[13px] font-medium tracking-tight text-[var(--color-text-primary)]">
          {table.schema && table.schema !== 'public' ? `${table.schema}.` : ''}
          {table.name}
        </span>
        {issueSeverity === 'error' && <Mark name="error" className="text-[var(--color-accent-danger)]" />}
        {issueSeverity === 'warning' && <Mark name="warning" className="text-[var(--color-accent-warning)]" />}
      </div>

      <div>
        {table.fields.length === 0 && (
          <div className="px-3.5 py-3 text-[12px] text-[var(--color-text-muted)]">
            No columns
          </div>
        )}
        {table.fields.map((field: SchemaField) => {
          const handleKey = `${id}.${field.name}`;
          const isPK = !!field.constraints.isPrimaryKey;
          const isUQ = !!field.constraints.isUnique && !isPK;
          const isFK = fkFields.has(field.name);
          const isNotNull = field.constraints.isNullable === false;

          return (
            <div
              key={field.id}
              className="group relative grid h-9 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-3.5 text-[12px] hover:bg-[var(--color-bg-tertiary)]"
            >
              <Handle
                type="target"
                position={Position.Left}
                id={`${handleKey}-target`}
                className="!h-1.5 !w-1.5 !-left-[5px] !rounded-none !border !border-[var(--color-bg-app)] !bg-[var(--color-text-muted)] opacity-0 group-hover:opacity-100"
              />

              <div className="flex min-w-0 items-center gap-1.5">
                {isPK && (
                  <span className="shrink-0 text-[9px] tracking-wide text-[var(--color-accent-primary)]">PK</span>
                )}
                <span
                  className="truncate font-medium text-[var(--color-text-primary)]"
                  title={field.note ? `${field.name} — ${field.note}` : field.name}
                >
                  {field.name}
                </span>
                {field.note && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help text-[var(--color-text-muted)]">
                        <Mark name="note" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <span className="text-xs">{field.note}</span>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              <span className="truncate text-right font-mono text-[11px] tracking-wide text-[var(--color-text-muted)]">
                {field.type}
                {(isFK || isUQ || (isNotNull && !isPK)) && (
                  <span className="ml-1.5 text-[9px] tracking-wide">
                    {[isFK ? 'FK' : '', isUQ ? 'UQ' : '', isNotNull && !isPK ? '*' : ''].filter(Boolean).join(' ')}
                  </span>
                )}
              </span>

              <Handle
                type="source"
                position={Position.Right}
                id={`${handleKey}-source`}
                className="!h-1.5 !w-1.5 !-right-[5px] !rounded-none !border !border-[var(--color-bg-app)] !bg-[var(--color-text-muted)] opacity-0 group-hover:opacity-100"
              />
            </div>
          );
        })}
      </div>

      {pkCount === 0 && table.fields.length > 0 && (
        <div className="border-t border-[var(--color-border-subtle)] px-3 py-1.5 text-[10px] text-[var(--color-accent-warning)]">
          No primary key
        </div>
      )}
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
TableNode.displayName = 'TableNode';
