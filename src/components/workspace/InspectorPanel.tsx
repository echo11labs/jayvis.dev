'use client';

import { useCallback, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

import { Checkbox } from '@/components/ui/checkbox';
import { Codicon } from '@/components/ui/codicon';
import { useDiagramStore } from '@/store/diagram-store';
import { TABLE_COLORS } from '@/types/ast';
import type { SchemaField } from '@/types/ast';
import { toast } from 'sonner';
import { confirmIf } from '@/lib/confirm-action';
import { Disclosure } from '@/components/workspace/Disclosure';
import { normalizeIdent } from '@/lib/ident';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

export function InspectorPanel({ onClose }: { onClose?: () => void }) {
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
  const [sections, setSections] = useState({
    columns: true,
    indexes: true,
    relations: true,
    note: false,
    appearance: false,
  });
  const toggleSection = (key: keyof typeof sections) => {
    setSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const table = selectedTable ? ast.tables[selectedTable] : null;
  // Theme-aware tokens for the inspector chrome.
  const panelBg = 'bg-[var(--color-bg-panel)]';
  const borderCls = 'border-[var(--color-border-subtle)]';
  const fieldRow = 'hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-panel)]';
  const closeBtn = 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)] hover:text-[var(--color-text-primary)]';
  const emptyTitle = 'text-[var(--color-text-muted)]';

  const handleAddField = useCallback(() => {
    if (!table) return;
    const name = normalizeIdent(newFieldName);
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
    confirmIf(true, {
      title: `Drop table ${name}?`,
      description: 'Related relationships will be removed. You can undo this.',
      confirmLabel: 'Drop table',
      action: () => {
        deleteTable(name);
        toast.success(`Dropped table "${name}"`);
      },
    });
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
    const nextName = normalizeIdent(fieldDraft.name);
    if (!nextName) {
      toast.error('Column name required');
      return;
    }
    if (
      nextName !== editingField &&
      table.fields.some((field) => field.name === nextName)
    ) {
      toast.error(`Column "${nextName}" already exists`);
      return;
    }
    updateField(table.name, editingField, { ...fieldDraft, name: nextName });
    setEditingField(null);
    setFieldDraft(null);
    toast.success('Column updated');
  }, [table, editingField, fieldDraft, updateField]);

  const commitTableRename = useCallback(() => {
    if (!table) return;
    const newName = normalizeIdent(tableNameDraft);
    if (!newName) {
      toast.error('Table name is required');
      setEditingTableName(false);
      return;
    }
    if (newName !== table.name && useDiagramStore.getState().ast.tables[newName]) {
      toast.error(`Table "${newName}" already exists`);
      return;
    }
    if (newName !== table.name) {
      renameTable(table.name, newName);
    }
    setEditingTableName(false);
  }, [table, tableNameDraft, renameTable]);

  const tableRefs = table
    ? Object.values(ast.references).filter(
        (ref) => ref.sourceTable === table.name || ref.targetTable === table.name,
      )
    : [];

  if (!table) {
    return (
      <div className={`flex h-full flex-col ${panelBg}`}>
        <div className="group flex h-8 shrink-0 items-center border-b border-[var(--color-border-subtle)] px-3">
          <span className="text-[11px] text-[var(--color-text-muted)]">Table Inspector</span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`ml-auto rounded p-1 ${closeBtn}`}
              aria-label="Close inspector"
            >
              <Codicon name="close" />
            </button>
          )}
        </div>
        <p className={`px-3 py-5 text-[12px] ${emptyTitle}`}>Select a table from the explorer or board.</p>
      </div>
    );
  }

  return (
    <div className={`flex h-full flex-col ${panelBg}`} role="complementary" aria-label={table.name}>
        <div className="group flex h-8 shrink-0 items-center border-b border-[var(--color-border-subtle)] px-3">
          <span className="text-[11px] text-[var(--color-text-muted)]">Table Inspector</span>
          <button
            onClick={() => (onClose ? onClose() : setSelectedTable(null))}
            className={`ml-auto rounded p-1 ${closeBtn}`}
            aria-label="Close inspector"
          >
            <Codicon name="close" />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border-subtle)] px-3 py-2">
          <span
            className="h-2 w-2 shrink-0"
            style={{ backgroundColor: table.color || '#c45c26' }}
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
              className="rounded border border-[var(--color-accent-primary)] bg-[var(--color-bg-app)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-text-primary)] outline-none"
            />
          ) : (
            <button
              onClick={() => {
                setTableNameDraft(table.name);
                setEditingTableName(true);
              }}
              className="group flex min-w-0 items-center gap-1 font-mono text-[13px] text-[var(--color-text-primary)]"
            >
              <span className="truncate">{table.name}</span>
              <Codicon name="pencil" className="opacity-0 transition-opacity group-hover:opacity-60" />
            </button>
          )}
          <span className="ml-auto border border-[var(--color-border-subtle)] px-1.5 font-mono text-[10px] text-[var(--color-text-muted)]">
            Table
          </span>
        </div>

        <ScrollArea className="flex-1">
          <Disclosure
            label="Columns"
            count={table.fields.length}
            open={sections.columns}
            onOpenChange={() => toggleSection('columns')}
          >
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
                    className={`group rounded-md border border-transparent px-2 py-2.5 ${fieldRow}`}
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
                            className="h-7 border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] font-mono text-xs"
                            autoFocus
                          />
                          <select
                            value={draft.type}
                            onChange={(e) =>
                              setFieldDraft({ ...draft, type: e.target.value })
                            }
                            className="h-7 rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-1.5 font-mono text-xs text-[var(--color-text-primary)]"
                          >
                            {Array.from(new Set([...Object.keys(TYPE_COLORS), draft.type])).map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-3 px-1">
                          <label className="flex cursor-pointer items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
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
                          <label className="flex cursor-pointer items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
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
                          <label className="flex cursor-pointer items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
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
                          <Input
                            value={draft.constraints.defaultValue ?? ''}
                            onChange={(e) =>
                              setFieldDraft({
                                ...draft,
                                constraints: {
                                  ...draft.constraints,
                                  defaultValue: e.target.value || undefined,
                                },
                              })
                            }
                            placeholder="default"
                            className="ml-auto h-6 w-24 border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-1.5 font-mono text-[10px]"
                          />
                          <label className="flex cursor-pointer items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                            <Checkbox
                              checked={!!draft.constraints.isIdentity}
                              onCheckedChange={(value) =>
                                setFieldDraft({
                                  ...draft,
                                  constraints: { ...draft.constraints, isIdentity: !!value },
                                })
                              }
                            />
                            Identity
                          </label>
                          <Input
                            value={draft.constraints.check ?? ''}
                            onChange={(event) =>
                              setFieldDraft({
                                ...draft,
                                constraints: {
                                  ...draft.constraints,
                                  check: event.target.value || undefined,
                                },
                              })
                            }
                            placeholder="check"
                            className="h-6 w-24 border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-1.5 font-mono text-[10px]"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={commitFieldEdit}
                              className="rounded p-1 text-emerald-400 hover:bg-[var(--color-bg-panel)]"
                            >
                              <Codicon name="check" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                      <div className="flex flex-col gap-1 px-1.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className={`truncate font-mono text-[13px] ${
                              isPK ? 'font-medium text-[var(--color-text-primary)]' : 'text-[var(--color-text-primary)]'
                            }`}
                          >
                            {f.name}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="ml-auto rounded px-1 text-[var(--color-text-muted)] opacity-0 hover:text-[var(--color-text-primary)] group-hover:opacity-100"
                                aria-label="Column actions"
                              >
                                ···
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[8rem] border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)]">
                              <DropdownMenuItem
                                className="text-[12px]"
                                onClick={() => {
                                  setEditingFieldNote(editingFieldNote === f.name ? null : f.name);
                                  setFieldNoteDraft(f.note || '');
                                }}
                              >
                                Note
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[12px]"
                                disabled={!canMoveUp}
                                onClick={() => moveField(table.name, fieldIdx, fieldIdx - 1)}
                              >
                                Move up
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[12px]"
                                disabled={!canMoveDown}
                                onClick={() => moveField(table.name, fieldIdx, fieldIdx + 1)}
                              >
                                Move down
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-[12px]" onClick={() => startEditField(f)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[12px] text-[var(--color-accent-danger)]"
                                onClick={() => {
                                  const columnName = f.name;
                                  confirmIf(true, {
                                    title: `Drop column ${columnName}?`,
                                    description:
                                      'Related relationships will be removed. You can undo this.',
                                    confirmLabel: 'Drop column',
                                    action: () => {
                                      deleteField(table.name, columnName);
                                      toast.success(`Dropped column "${columnName}"`);
                                    },
                                  });
                                }}
                              >
                                Drop
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--color-text-muted)]">
                          <span className="tracking-wide">{draft.type}</span>
                          {isPK && <span className="rounded-sm bg-[var(--color-bg-tertiary)] px-1 text-[9px] tracking-wide text-[var(--color-text-secondary)]">PK</span>}
                          {isFK && <span className="text-[9px] tracking-wide">FK</span>}
                          {isUQ && <span className="text-[9px] tracking-wide">UQ</span>}
                          {draft.constraints.isNullable === false && !isPK && <span title="NOT NULL">*</span>}
                          {f.note && <span title={f.note}>note</span>}
                        </div>
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
                              className="w-full resize-none rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-2 py-1 text-[11px] text-[var(--color-text-primary)] outline-none focus:border-indigo-500"
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
                                className="rounded px-2 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add column row */}
            <div className="mt-2 flex items-center gap-1.5 rounded-md border border-dashed border-[var(--color-border-subtle)] px-2 py-1.5">
              <Codicon name="plus" className="flex-shrink-0 text-[var(--color-text-muted)]" />
              <input
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddField();
                }}
                placeholder="new column"
                className="h-6 flex-1 rounded bg-transparent font-mono text-xs text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
              />
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value)}
                className="h-6 rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-1 font-mono text-[11px] text-[var(--color-text-primary)]"
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
          </Disclosure>

          <Disclosure
            label="Indexes"
            count={table.indexes?.length || 0}
            open={sections.indexes}
            onOpenChange={() => toggleSection('indexes')}
          >
              {(table.indexes?.length || 0) === 0 && (
                <p className="px-2.5 py-1.5 text-[12px] text-[var(--color-text-muted)]">
                  No indexes
                </p>
              )}
              {(table.indexes ?? []).map((index, i) => (
                <div key={`${index.name || 'idx'}-${i}`} className="flex flex-col gap-0.5 px-2.5 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 truncate font-mono text-[12px] text-[var(--color-text-primary)]">
                      {index.name || index.columns.join('_')}
                    </span>
                    {index.isUnique && (
                      <span className="font-mono text-[10px] tracking-wide text-[var(--color-text-muted)]">UNIQUE</span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{index.columns.join(', ')}</span>
                </div>
              ))}
          </Disclosure>

          <Disclosure
            label="Relations"
            count={tableRefs.length}
            open={sections.relations}
            onOpenChange={() => toggleSection('relations')}
          >
              {tableRefs.length === 0 && (
                <p className="px-2.5 py-1.5 text-[12px] text-[var(--color-text-muted)]">
                  No relations
                </p>
              )}
              {tableRefs.map((ref) => {
                const other = ref.sourceTable === table.name ? ref.targetTable : ref.sourceTable;
                const otherField = ref.sourceTable === table.name ? ref.targetField : ref.sourceField;
                const mark =
                  ref.cardinality === '1:1' ? '1:1' : ref.cardinality === 'N:M' ? '*:*' : '1:*';
                return (
                  <button
                    key={ref.id}
                    type="button"
                    onClick={() => setSelectedTable(other)}
                    className="flex w-full flex-col items-start gap-0.5 px-2.5 py-1.5 text-left hover:bg-[var(--color-bg-tertiary)]"
                  >
                    <span className="truncate font-mono text-[12px] text-[var(--color-text-primary)]">{other}</span>
                    <span className="font-mono text-[10px] tracking-wide text-[var(--color-text-muted)]">
                      {mark} · {other}.{otherField}
                    </span>
                  </button>
                );
              })}
          </Disclosure>

          <Disclosure
            label="Note"
            open={sections.note || editingTableNote}
            onOpenChange={() => toggleSection('note')}
            detail={table.note ? 'Set' : undefined}
            action={
              !editingTableNote ? (
                <button
                  onClick={() => {
                    setTableNoteDraft(table.note || '');
                    setEditingTableNote(true);
                    setSections((current) => ({ ...current, note: true }));
                  }}
                  className="px-2 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                >
                  {table.note ? 'Edit' : 'Add'}
                </button>
              ) : null
            }
          >
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
                    className="w-full resize-none rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-2 py-1 text-[11px] text-[var(--color-text-primary)] outline-none"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setTableNote(table.name, tableNoteDraft.trim());
                        setEditingTableNote(false);
                        toast.success('Note saved');
                      }}
                      className="rounded bg-[var(--color-accent-primary)] px-2 py-0.5 text-[10px] text-white"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingTableNote(false)}
                      className="rounded px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className={`px-2.5 text-[12px] ${table.note ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-muted)]'}`}>
                  {table.note || 'No note'}
                </p>
              )}
          </Disclosure>

          <Disclosure
            label="Appearance"
            open={sections.appearance}
            onOpenChange={() => toggleSection('appearance')}
          >
            <div className="flex flex-wrap items-center gap-2 px-2.5 py-1.5">
              {TABLE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setTableColor(table.name, c)}
                  className={`h-4 w-4 ${
                    table.color === c ? 'ring-1 ring-[var(--color-text-primary)] ring-offset-1 ring-offset-[var(--color-bg-panel)]' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </Disclosure>
        </ScrollArea>

        <div className={`shrink-0 border-t ${borderCls} p-2`}>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={handleDuplicateTable}
              className="flex h-7 items-center justify-center gap-1.5 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <Codicon name="copy" />
              Duplicate
            </button>
            <button
              onClick={handleDeleteTable}
              className="flex h-7 items-center justify-center gap-1.5 text-[11px] text-rose-400 hover:text-rose-300"
            >
              <Codicon name="trash" />
              Drop
            </button>
          </div>
        </div>
      </div>
  );
}
