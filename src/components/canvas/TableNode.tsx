'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { SchemaTable, SchemaField } from '@/types/ast';

export interface TableNodeData {
  table: SchemaTable;
  [key: string]: unknown;
}

const TYPE_COLORS: Record<string, string> = {
  uuid: 'text-violet-400',
  integer: 'text-sky-400',
  bigint: 'text-sky-400',
  serial: 'text-sky-400',
  bigserial: 'text-sky-400',
  varchar: 'text-emerald-400',
  text: 'text-emerald-400',
  boolean: 'text-amber-400',
  timestamp: 'text-pink-400',
  timestamptz: 'text-pink-400',
  date: 'text-pink-400',
  time: 'text-pink-400',
  jsonb: 'text-orange-400',
  json: 'text-orange-400',
  decimal: 'text-cyan-400',
  numeric: 'text-cyan-400',
  real: 'text-cyan-400',
  float: 'text-cyan-400',
};

function typeColor(type: string): string {
  const base = type.split('(')[0];
  return TYPE_COLORS[base] || 'text-zinc-400';
}

function TableNodeComponent({ id, data, selected }: NodeProps<TableNodeData>) {
  const table = data.table;
  const headerColor = table.color || '#6366F1';
  const pkCount = table.fields.filter((f) => f.constraints.isPrimaryKey).length;

  return (
    <div
      className={`min-w-[270px] rounded-xl border bg-zinc-950 font-sans shadow-2xl shadow-black/40 transition-all duration-150 ${
        selected
          ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-indigo-500/10'
          : 'border-zinc-800 hover:border-zinc-600'
      }`}
    >
      {/* Table Header */}
      <div
        className="relative flex items-center justify-between overflow-hidden rounded-t-xl border-b border-zinc-800/80 px-3 py-2"
        style={{
          background: `linear-gradient(135deg, ${headerColor}22 0%, transparent 60%)`,
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: headerColor }}
        />
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-[9px] font-bold text-white"
            style={{ backgroundColor: headerColor }}
          >
            {table.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex-shrink-0">
            {table.schema || 'public'}
          </span>
          <span className="truncate text-sm font-semibold text-zinc-100">
            {table.name}
          </span>
        </div>
        <span className="flex-shrink-0 rounded-md bg-zinc-900/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
          {table.fields.length} col
        </span>
      </div>

      {/* Field List */}
      <div className="py-0.5">
        {table.fields.length === 0 && (
          <div className="px-3 py-2 text-[10px] italic text-zinc-600">
            no columns
          </div>
        )}
        {table.fields.map((field: SchemaField, idx: number) => {
          const handleKey = `${id}.${field.name}`;
          const isPK = !!field.constraints.isPrimaryKey;
          const isUQ = !!field.constraints.isUnique && !isPK;
          const isNotNull = field.constraints.isNullable === false;
          const hasDefault = !!field.constraints.defaultValue;
          const isAutoinc = !!field.constraints.isAutoincrement;

          return (
            <div
              key={field.id}
              className={`group relative flex items-center justify-between gap-2 px-3 py-1.5 text-xs transition-colors ${
                idx % 2 === 1 ? 'bg-zinc-900/20' : ''
              } hover:bg-zinc-800/60`}
            >
              {/* Target Handle */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${handleKey}-target`}
                className="!h-2 !w-2 !-left-[6px] !rounded-full !border-2 !border-zinc-950 !bg-zinc-700 transition-all hover:!bg-indigo-400 hover:!scale-125"
              />

              {/* Column Name & Badges */}
              <div className="flex min-w-0 items-center gap-1.5">
                {isPK && (
                  <span
                    className="flex-shrink-0 rounded bg-amber-500/15 px-1 py-0.5 font-mono text-[9px] font-bold text-amber-400 border border-amber-500/25"
                    title="Primary Key"
                  >
                    PK
                  </span>
                )}
                {isUQ && (
                  <span
                    className="flex-shrink-0 rounded bg-sky-500/15 px-1 py-0.5 font-mono text-[9px] font-bold text-sky-400 border border-sky-500/25"
                    title="Unique"
                  >
                    UQ
                  </span>
                )}
                <span
                  className={`truncate ${
                    isPK
                      ? 'font-semibold text-zinc-100'
                      : 'text-zinc-300'
                  }`}
                  title={field.note ? `${field.name} — ${field.note}` : field.name}
                >
                  {field.name}
                </span>
                {field.note && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex-shrink-0 cursor-help text-amber-500/60 hover:text-amber-400">
                        ●
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <span className="text-xs">{field.note}</span>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Constraints + Type */}
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {isAutoinc && (
                    <span
                      className="rounded bg-zinc-800 px-1 font-mono text-[8px] font-bold text-zinc-500"
                      title="Auto-increment"
                    >
                      ⚡
                    </span>
                  )}
                  {hasDefault && (
                    <span
                      className="rounded bg-zinc-800 px-1 font-mono text-[8px] font-bold text-emerald-600"
                      title={`Default: ${field.constraints.defaultValue}`}
                    >
                      =
                    </span>
                  )}
                </div>
                <span
                  className={`font-mono text-[11px] ${typeColor(field.type)}`}
                >
                  {field.type}
                </span>
                {isNotNull && (
                  <span
                    className="font-mono text-[10px] text-rose-400"
                    title="NOT NULL"
                  >
                    *
                  </span>
                )}
              </div>

              {/* Source Handle */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${handleKey}-source`}
                className="!h-2 !w-2 !-right-[6px] !rounded-full !border-2 !border-zinc-950 !bg-zinc-700 transition-all hover:!bg-indigo-400 hover:!scale-125"
              />
            </div>
          );
        })}
      </div>

      {/* Footer: indexes summary */}
      {table.indexes && table.indexes.length > 0 && (
        <div className="border-t border-zinc-800/60 px-3 py-1 text-[10px] text-zinc-600">
          <span className="font-mono">
            {table.indexes.length} index{table.indexes.length > 1 ? 'es' : ''}
          </span>
        </div>
      )}
      {pkCount === 0 && table.fields.length > 0 && (
        <div className="border-t border-amber-500/20 bg-amber-500/5 px-3 py-1 text-[10px] text-amber-500/70">
          ⚠ no primary key
        </div>
      )}
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
TableNode.displayName = 'TableNode';
