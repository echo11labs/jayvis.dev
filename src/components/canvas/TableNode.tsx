'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SchemaTable, SchemaField } from '@/types/ast';

export interface TableNodeData {
  table: SchemaTable;
  [key: string]: unknown;
}

function TableNodeComponent({ id, data, selected }: NodeProps<TableNodeData>) {
  const table = data.table;
  const headerColor = table.color || '#6366F1';

  return (
    <div
      className={`min-w-[260px] rounded-lg border bg-zinc-950 font-sans shadow-2xl transition-all duration-150 ${
        selected
          ? 'border-indigo-500 ring-2 ring-indigo-500/40'
          : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Table Header */}
      <div
        className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-2 bg-zinc-900/60 rounded-t-lg"
        style={{ borderTop: `3px solid ${headerColor}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: headerColor }}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex-shrink-0">
            {table.schema || 'public'}
          </span>
          <span className="text-xs font-semibold text-zinc-100 truncate">
            {table.name}
          </span>
        </div>
        <span className="font-mono text-[10px] text-zinc-500 flex-shrink-0 ml-2">
          {table.fields.length} col
        </span>
      </div>

      {/* Field List */}
      <div className="py-1">
        {table.fields.length === 0 && (
          <div className="px-3 py-2 text-[10px] italic text-zinc-600">
            no columns
          </div>
        )}
        {table.fields.map((field: SchemaField) => {
          const handleKey = `${id}.${field.name}`;
          const isPK = !!field.constraints.isPrimaryKey;
          const isUQ = !!field.constraints.isUnique && !isPK;
          const isNotNull = field.constraints.isNullable === false;

          return (
            <div
              key={field.id}
              className="group relative flex items-center justify-between gap-2 px-3 py-1.5 text-xs hover:bg-zinc-900/80 transition-colors"
            >
              {/* Target Handle (Incoming Foreign Key) */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${handleKey}-target`}
                className="!h-2.5 !w-2.5 !-left-[5px] !rounded-full !border-2 !border-zinc-950 !bg-zinc-600 transition-colors group-hover:!bg-indigo-400"
              />

              {/* Column Name & Constraints */}
              <div className="flex items-center gap-1.5 min-w-0">
                {isPK && (
                  <span
                    className="rounded bg-amber-500/10 px-1 py-0.5 font-mono text-[9px] font-bold text-amber-400 border border-amber-500/20 flex-shrink-0"
                    title="Primary Key"
                  >
                    PK
                  </span>
                )}
                {isUQ && (
                  <span
                    className="rounded bg-sky-500/10 px-1 py-0.5 font-mono text-[9px] font-bold text-sky-400 border border-sky-500/20 flex-shrink-0"
                    title="Unique"
                  >
                    UQ
                  </span>
                )}
                <span
                  className={`truncate ${
                    isPK ? 'font-medium text-zinc-100' : 'text-zinc-300'
                  }`}
                >
                  {field.name}
                </span>
              </div>

              {/* Data Type */}
              <div className="flex items-center gap-1 font-mono text-[11px] flex-shrink-0">
                <span className="text-zinc-500">{field.type}</span>
                {isNotNull && (
                  <span className="text-rose-400 font-bold" title="NOT NULL">
                    *
                  </span>
                )}
              </div>

              {/* Source Handle (Outgoing Reference) */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${handleKey}-source`}
                className="!h-2.5 !w-2.5 !-right-[5px] !rounded-full !border-2 !border-zinc-950 !bg-zinc-600 transition-colors group-hover:!bg-indigo-400"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
TableNode.displayName = 'TableNode';
