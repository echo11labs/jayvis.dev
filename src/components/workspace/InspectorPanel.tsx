'use client';

import { useCallback, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Database,
  Plus,
  Trash2,
  Key,
  Link2,
  Hash,
  Palette,
  X,
  Pencil,
  Check,
  StickyNote,
  Copy,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useDiagramStore } from '@/store/diagram-store';
import { TABLE_COLORS } from '@/types/ast';
import type { SchemaField } from '@/types/ast';
import { useTheme } from '@/hooks/use-theme-state';
import { toast } from 'sonner';

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
  jsonb: 'text-orange-400',
  decimal: 'text-cyan-400',
  numeric: 'text-cyan-400',
};

function typeColor(type: string): string {
  const base = type.split('(')[0];
  return TYPE_COLORS[base] || 'text-zinc-400';
}

export function InspectorPanel() {
  const selectedTable = useDiagramStore((s) => s.selectedTable);
  const ast = useDiagramStore((s) => s.ast);
  const setSelectedTable = useDiagramStore((s) => s.setSelectedTable);
  const addFieldToTable = useDiagramStore((s) => s.addFieldToTable);
  const updateField = useDiagramStore((s) => s.updateField);
  const deleteField = useDiagramStore((s) => s.deleteField);
  const deleteTable = useDiagramStore((s) => s.deleteTable);
  const setTableColor = useDiagramStore((s) => s.setTableColor);
  const renameTable = useDiagramStore((s) => s.renameTable);
  const setTableNote = useDiagramStore((s) => s.setTableNote);
  const setFieldNote = useDiagramStore((s) => s.setFieldNote);
  const addTable = useDiagramStore((s) => s.addTable);
  const moveField = useDiagramStore((s) => s.moveField);

  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('varchar');
  const [editingTableName, setEditingTableName] = useState(false);
  const [tableNameDraft, setTableNameDraft] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = useState<SchemaField | null>(null);
  const [tableNoteDraft, setTableNoteDraft] = useState('');
  const [editingTableNote, setEditingTableNote] = useState(false);
  const [editingFieldNote, setEditingFieldNote] = useState<string | null>(null);
  const [fieldNoteDraft, setFieldNoteDraft] = useState('');

  const table = selectedTable ? ast.tables[selectedTable] : null;
  const theme = useTheme();
  const isDark = theme === 'dark';

  // Theme-aware tokens for the inspector chrome.
  const panelBg = isDark ? 'bg-zinc-950/80' : 'bg-white/90';
  const borderCls = isDark ? 'border-zinc-800' : 'border-zinc-200';
  const metaText = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const metaDim = isDark ? 'text-zinc-600' : 'text-zinc-400';
  const sectionLabel = isDark ? 'text-zinc-600' : 'text-zinc-400';
  const fieldRow = isDark ? 'hover:border-zinc-800 hover:bg-zinc-900/60' : 'hover:border-zinc-200 hover:bg-zinc-50';
  const fieldText = isDark ? 'text-zinc-300' : 'text-zinc-700';
  const pkText = isDark ? 'text-zinc-100' : 'text-zinc-900';
  const closeBtn = isDark ? 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200' : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600';
  const emptyIcon = isDark ? 'text-zinc-700' : 'text-zinc-300';
  const emptyTitle = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const emptyDesc = isDark ? 'text-zinc-600' : 'text-zinc-500';

  const handleAddField = useCallback(() => {
    if (!table) return;
    const name = newFieldName.trim().toLowerCase();
    if (!name) {
      toast.error('Column name required');
      return;
    }
    if (table.fields.some((f) => f.name === name)) {
      toast.error(`Column "${name}" already exists`);
      return;
    }
    addFieldToTable(table.name, {
      id: `${table.name}.${name}`,
      name,
      type: newFieldType,
      constraints: { isNullable: true },
    });
    toast.success(`Added column "${name}"`);
    setNewFieldName('');
  }, [table, newFieldName, newFieldType, addFieldToTable]);

  const handleDeleteTable = useCallback(() => {
    if (!table) return;
    const name = table.name;
    deleteTable(name);
    toast.success(`Dropped table "${name}"`);
  }, [table, deleteTable]);

  const handleDuplicateTable = useCallback(() => {
    if (!table) return;
    // Find a unique name like "users_copy", "users_copy_2", etc.
    let base = `${table.name}_copy`;
    let suffix = '';
    const ast = useDiagramStore.getState().ast;
    while (ast.tables[`${base}${suffix}`]) {
      suffix = suffix === '' ? '2' : String(Number(suffix) + 1);
    }
    const newName = `${base}${suffix}`;
    const clonedFields: SchemaField[] = table.fields.map((f) => ({
      ...f,
      id: `${newName}.${f.name}`,
      constraints: { ...f.constraints },
    }));
    addTable({
      ...table,
      id: newName,
      name: newName,
      fields: clonedFields,
      position: {
        x: (table.position?.x ?? 0) + 40,
        y: (table.position?.y ?? 0) + 40,
      },
    });
    toast.success(`Duplicated table as "${newName}"`);
  }, [table, addTable]);

  const startEditField = useCallback((f: SchemaField) => {
    setEditingField(f.name);
    setFieldDraft({ ...f });
  }, []);

  const commitFieldEdit = useCallback(() => {
    if (!table || !editingField || !fieldDraft) return;
    updateField(table.name, editingField, fieldDraft);
    setEditingField(null);
    setFieldDraft(null);
    toast.success('Column updated');
  }, [table, editingField, fieldDraft, updateField]);

  const commitTableRename = useCallback(() => {
    if (!table) return;
    const newName = tableNameDraft.trim().toLowerCase();
    if (newName && newName !== table.name) {
      renameTable(table.name, newName);
    }
    setEditingTableName(false);
  }, [table, tableNameDraft, renameTable]);

  if (!table) {
    return (
      <div className={`flex h-full flex-col items-center justify-center gap-2 border-l ${borderCls} ${isDark ? 'bg-zinc-950/60' : 'bg-zinc-50'} p-4 text-center`}>
        <Database className={`h-8 w-8 ${emptyIcon}`} />
        <p className={`text-xs font-medium ${emptyTitle}`}>No table selected</p>
        <p className={`text-[11px] ${emptyDesc}`}>
          Click a table on the canvas to inspect and edit its columns.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={`flex h-full flex-col border-l ${borderCls} ${panelBg} backdrop-blur-sm animate-fade-in`}>
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-3 py-2.5"
          style={{ borderTop: `3px solid ${table.color || '#6366F1'}` }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: table.color || '#6366F1' }}
            />
            {editingTableName ? (
              <input
                autoFocus
                value={tableNameDraft}
                onChange={(e) => setTableNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTableRename();
                  if (e.key === 'Escape') setEditingTableName(false);
                }}
                onBlur={commitTableRename}
                className="rounded border border-indigo-500 bg-zinc-900 px-1.5 py-0.5 font-mono text-xs text-zinc-100 outline-none"
              />
            ) : (
              <button
                onClick={() => {
                  setTableNameDraft(table.name);
                  setEditingTableName(true);
                }}
                className="group flex items-center gap-1 font-mono text-sm font-semibold text-zinc-100"
              >
                {table.name}
                <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
              </button>
            )}
          </div>
          <button
            onClick={() => setSelectedTable(null)}
            className={`rounded p-1 ${closeBtn}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Meta */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-3 py-2 text-[11px]">
          <span className="font-mono text-zinc-500">
            {table.schema || 'public'}.{table.name}
          </span>
          <span className="font-mono text-zinc-600">
            {table.fields.length} col · {table.indexes?.length || 0} idx
          </span>
        </div>

        {/* Color picker */}
        <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 px-3 py-2">
          <Palette className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-[11px] text-zinc-500">Color</span>
          <div className="flex gap-1.5">
            {TABLE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setTableColor(table.name, c)}
                className={`h-4 w-4 rounded-full transition-transform hover:scale-110 ${
                  table.color === c ? 'ring-2 ring-zinc-300 ring-offset-1 ring-offset-zinc-950' : ''
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Table note */}
        <div className="shrink-0 border-b border-zinc-800 px-3 py-2">
          <div className="mb-1 flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[11px] text-zinc-500">Table note</span>
            {!editingTableNote && (
              <button
                onClick={() => {
                  setTableNoteDraft(table.note || '');
                  setEditingTableNote(true);
                }}
                className="ml-auto text-[10px] text-zinc-600 hover:text-indigo-300"
              >
                {table.note ? 'Edit' : '+ Add'}
              </button>
            )}
          </div>
          {editingTableNote ? (
            <div className="space-y-1.5">
              <textarea
                autoFocus
                value={tableNoteDraft}
                onChange={(e) => setTableNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    setTableNote(table.name, tableNoteDraft.trim());
                    setEditingTableNote(false);
                    toast.success('Note saved');
                  }
                  if (e.key === 'Escape') setEditingTableNote(false);
                }}
                placeholder="Describe this table…"
                rows={2}
                className="w-full resize-none rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-indigo-500"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setTableNote(table.name, tableNoteDraft.trim());
                    setEditingTableNote(false);
                    toast.success('Note saved');
                  }}
                  className="rounded bg-indigo-600/80 px-2 py-0.5 text-[10px] text-white hover:bg-indigo-500"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingTableNote(false)}
                  className="rounded px-2 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className={`text-[11px] ${table.note ? 'text-zinc-400' : 'italic text-zinc-600'}`}>
              {table.note || 'No note'}
            </p>
          )}
        </div>

        {/* Fields */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Columns
            </div>
            <div className="space-y-1">
              {table.fields.map((f, fieldIdx) => {
                const isEditing = editingField === f.name;
                const draft = isEditing && fieldDraft ? fieldDraft : f;
                const isPK = !!draft.constraints.isPrimaryKey;
                const isUQ = !!draft.constraints.isUnique && !isPK;
                const isFK = Object.values(ast.references).some(
                  (r) =>
                    (r.sourceTable === table.name && r.sourceField === f.name) ||
                    (r.targetTable === table.name && r.targetField === f.name),
                );
                const canMoveUp = fieldIdx > 0;
                const canMoveDown = fieldIdx < table.fields.length - 1;

                return (
                  <div
                    key={f.id}
                    className={`group rounded-md border border-transparent px-2 py-1.5 ${fieldRow}`}
                  >
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <div className="flex gap-1.5">
                          <Input
                            value={draft.name}
                            onChange={(e) =>
                              setFieldDraft({
                                ...draft,
                                name: e.target.value,
                                id: `${table.name}.${e.target.value}`,
                              })
                            }
                            className="h-7 border-zinc-800 bg-zinc-950 font-mono text-xs"
                            autoFocus
                          />
                          <select
                            value={draft.type}
                            onChange={(e) =>
                              setFieldDraft({ ...draft, type: e.target.value })
                            }
                            className="h-7 rounded border border-zinc-800 bg-zinc-950 px-1.5 font-mono text-xs text-zinc-100"
                          >
                            {Object.keys(TYPE_COLORS).map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-3 px-1">
                          <label className="flex cursor-pointer items-center gap-1 text-[10px] text-zinc-500">
                            <Checkbox
                              checked={isPK}
                              onCheckedChange={(v) =>
                                setFieldDraft({
                                  ...draft,
                                  constraints: {
                                    ...draft.constraints,
                                    isPrimaryKey: !!v,
                                    isNullable: !!v ? false : draft.constraints.isNullable,
                                  },
                                })
                              }
                            />
                            PK
                          </label>
                          <label className="flex cursor-pointer items-center gap-1 text-[10px] text-zinc-500">
                            <Checkbox
                              checked={isUQ}
                              onCheckedChange={(v) =>
                                setFieldDraft({
                                  ...draft,
                                  constraints: {
                                    ...draft.constraints,
                                    isUnique: !!v,
                                  },
                                })
                              }
                            />
                            UQ
                          </label>
                          <label className="flex cursor-pointer items-center gap-1 text-[10px] text-zinc-500">
                            <Checkbox
                              checked={draft.constraints.isNullable !== false}
                              onCheckedChange={(v) =>
                                setFieldDraft({
                                  ...draft,
                                  constraints: {
                                    ...draft.constraints,
                                    isNullable: !!v,
                                  },
                                })
                              }
                              disabled={isPK}
                            />
                            Nullable
                          </label>
                          <div className="ml-auto flex gap-1">
                            <button
                              onClick={commitFieldEdit}
                              className="rounded p-1 text-emerald-400 hover:bg-zinc-800"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          {isPK && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex-shrink-0 rounded bg-amber-500/10 px-1 py-0.5 font-mono text-[9px] font-bold text-amber-400 border border-amber-500/20">
                                  <Key className="h-2.5 w-2.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Primary Key</TooltipContent>
                            </Tooltip>
                          )}
                          {isUQ && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex-shrink-0 rounded bg-sky-500/10 px-1 py-0.5 font-mono text-[9px] font-bold text-sky-400 border border-sky-500/20">
                                  UQ
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Unique</TooltipContent>
                            </Tooltip>
                          )}
                          {isFK && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link2 className="h-3 w-3 flex-shrink-0 text-indigo-400" />
                              </TooltipTrigger>
                              <TooltipContent>Foreign Key</TooltipContent>
                            </Tooltip>
                          )}
                          <span
                            className={`truncate font-mono text-xs ${
                              isPK ? 'font-semibold text-zinc-100' : 'text-zinc-300'
                            }`}
                          >
                            {f.name}
                          </span>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1">
                          <span
                            className={`font-mono text-[11px] ${typeColor(draft.type)}`}
                          >
                            {draft.type}
                          </span>
                          {draft.constraints.isNullable === false && !isPK && (
                            <span
                              className="font-mono text-[10px] text-rose-400"
                              title="NOT NULL"
                            >
                              *
                            </span>
                          )}
                          {f.note && (
                            <span
                              title={f.note}
                              className="text-amber-500/70"
                            >
                              <StickyNote className="h-3 w-3" />
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setEditingFieldNote(editingFieldNote === f.name ? null : f.name);
                              setFieldNoteDraft(f.note || '');
                            }}
                            className={`rounded p-0.5 transition-opacity hover:bg-zinc-800 hover:text-amber-300 ${
                              editingFieldNote === f.name
                                ? 'text-amber-400 opacity-100'
                                : 'text-zinc-600 opacity-0 group-hover:opacity-100'
                            }`}
                            title="Edit column note"
                          >
                            <StickyNote className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => moveField(table.name, fieldIdx, fieldIdx - 1)}
                            disabled={!canMoveUp}
                            className="rounded p-0.5 text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-zinc-200 group-hover:opacity-100 disabled:opacity-0"
                            title="Move up"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => moveField(table.name, fieldIdx, fieldIdx + 1)}
                            disabled={!canMoveDown}
                            className="rounded p-0.5 text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-zinc-200 group-hover:opacity-100 disabled:opacity-0"
                            title="Move down"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => startEditField(f)}
                            className="rounded p-0.5 text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-indigo-300 group-hover:opacity-100"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => {
                              deleteField(table.name, f.name);
                              toast.success(`Dropped column "${f.name}"`);
                            }}
                            className="rounded p-0.5 text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-rose-400 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        {editingFieldNote === f.name && (
                          <div className="mt-1.5 space-y-1.5">
                            <textarea
                              autoFocus
                              value={fieldNoteDraft}
                              onChange={(e) => setFieldNoteDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                  setFieldNote(table.name, f.name, fieldNoteDraft.trim());
                                  setEditingFieldNote(null);
                                  toast.success('Column note saved');
                                }
                                if (e.key === 'Escape') setEditingFieldNote(null);
                              }}
                              placeholder={`Describe column "${f.name}"…`}
                              rows={2}
                              className="w-full resize-none rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-indigo-500"
                            />
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => {
                                  setFieldNote(table.name, f.name, fieldNoteDraft.trim());
                                  setEditingFieldNote(null);
                                  toast.success('Column note saved');
                                }}
                                className="rounded bg-indigo-600/80 px-2 py-0.5 text-[10px] text-white hover:bg-indigo-500"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingFieldNote(null)}
                                className="rounded px-2 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add column row */}
            <div className="mt-2 flex items-center gap-1.5 rounded-md border border-dashed border-zinc-800 px-2 py-1.5">
              <Plus className="h-3 w-3 flex-shrink-0 text-zinc-600" />
              <input
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddField();
                }}
                placeholder="new column"
                className="h-6 flex-1 rounded bg-transparent font-mono text-xs text-zinc-200 outline-none placeholder:text-zinc-700"
              />
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value)}
                className="h-6 rounded border border-zinc-800 bg-zinc-950 px-1 font-mono text-[11px] text-zinc-300"
              >
                {Object.keys(TYPE_COLORS).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddField}
                disabled={!newFieldName.trim()}
                className="rounded bg-indigo-600/80 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-indigo-500 disabled:opacity-30"
              >
                Add
              </button>
            </div>
          </div>
        </ScrollArea>

        {/* Footer: duplicate + delete table */}
        <div className={`shrink-0 border-t ${borderCls} grid grid-cols-2 gap-1.5 p-2`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDuplicateTable}
            className={`gap-1.5 ${isDark ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'}`}
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteTable}
            className="gap-1.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Drop
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
