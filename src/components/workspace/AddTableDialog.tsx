'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Codicon } from '@/components/ui/codicon';
import { useDiagramStore } from '@/store/diagram-store';
import type { SchemaField, SchemaTable } from '@/types/ast';
import { hasDuplicateIdents, normalizeIdent } from '@/lib/ident';
import { toast } from 'sonner';

interface AddTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FieldDraft {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isUnique: boolean;
  isNullable: boolean;
}

const COMMON_TYPES = [
  'uuid', 'integer', 'bigint', 'varchar', 'text', 'boolean',
  'timestamp', 'timestamptz', 'jsonb', 'decimal', 'serial',
];

const DEFAULT_FIELDS: FieldDraft[] = [
  { name: 'id', type: 'integer', isPrimaryKey: true, isUnique: false, isNullable: false },
  { name: 'created_at', type: 'timestamptz', isPrimaryKey: false, isUnique: false, isNullable: false },
];

export function AddTableDialog({ open, onOpenChange }: AddTableDialogProps) {
  const addTable = useDiagramStore((s) => s.addTable);
  const syncStatus = useDiagramStore((s) => s.syncStatus);
  const dialogCls = 'border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] text-[var(--color-text-primary)]';
  const descCls = 'text-[var(--color-text-muted)]';
  const inputCls = 'border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] font-mono text-sm text-[var(--color-text-primary)] focus:border-indigo-500';
  const fieldRowCls = 'border-[var(--color-border-subtle)] bg-[var(--color-bg-app)]';
  const selectCls = 'border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] text-[var(--color-text-primary)]';
  const fieldsContainerCls = 'border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)]';
  const [tableName, setTableName] = useState('');
  const [schema, setSchema] = useState('public');
  const [fields, setFields] = useState<FieldDraft[]>(DEFAULT_FIELDS.map((f) => ({ ...f })));

  const reset = useCallback(() => {
    setTableName('');
    setSchema('public');
    setFields(DEFAULT_FIELDS.map((f) => ({ ...f })));
  }, []);

  const addField = useCallback(() => {
    setFields((prev) => [
      ...prev,
      { name: '', type: 'varchar', isPrimaryKey: false, isUnique: false, isNullable: true },
    ]);
  }, []);

  const removeField = useCallback((idx: number) => {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateField = useCallback(
    (idx: number, patch: Partial<FieldDraft>) => {
      setFields((prev) =>
        prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
      );
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    if (useDiagramStore.getState().syncStatus !== 'synced') {
      toast.error('Cannot add a table while DBML is not synced');
      return;
    }
    const name = normalizeIdent(tableName);
    if (!name) {
      toast.error('Table name is required');
      return;
    }
    if (useDiagramStore.getState().ast.tables[name]) {
      toast.error(`Table "${name}" already exists`);
      return;
    }

    const validFields = fields
      .map((field) => ({ ...field, name: normalizeIdent(field.name) }))
      .filter((field) => field.name);
    if (validFields.length === 0) {
      toast.error('At least one column is required');
      return;
    }
    if (hasDuplicateIdents(validFields.map((field) => field.name))) {
      toast.error('Column names must be unique');
      return;
    }

    const schemaFields: SchemaField[] = validFields.map((f) => ({
      id: `${name}.${f.name}`,
      name: f.name,
      type: f.type.trim() || 'varchar',
      constraints: {
        isPrimaryKey: f.isPrimaryKey,
        isUnique: f.isUnique && !f.isPrimaryKey,
        isNullable: f.isPrimaryKey ? false : f.isNullable,
      },
    }));

    const nodes = useDiagramStore.getState().nodes;
    const last = nodes[nodes.length - 1];
    const position = last
      ? { x: last.position.x + 280, y: last.position.y }
      : { x: 80, y: 80 };

    const table: SchemaTable = {
      id: name,
      name,
      schema: schema.trim() || 'public',
      fields: schemaFields,
      position,
    };

    addTable(table);
    toast.success(`Created table "${name}"`);
    reset();
    onOpenChange(false);
  }, [tableName, schema, fields, addTable, reset, onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className={`${dialogCls} sm:max-w-[560px]`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Codicon name="table" />
            Create Table
          </DialogTitle>
          <DialogDescription className={descCls}>
            Add a new table to the schema. It will appear on the canvas and
            sync to the DBML editor instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="table-name" className="text-xs text-[var(--color-text-muted)]">
              Table name
            </Label>
            <Input
              id="table-name"
              autoFocus
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
              placeholder="e.g. orders, users"
              className={`font-mono text-sm focus:border-indigo-500 ${inputCls}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="schema-name" className="text-xs text-[var(--color-text-muted)]">
              Schema
            </Label>
            <Input
              id="schema-name"
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
              placeholder="public"
              className={`font-mono text-sm focus:border-indigo-500 ${inputCls}`}
            />
          </div>
        </div>

        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-[var(--color-text-muted)]">Columns</Label>
            <Button
              size="sm"
              variant="ghost"
              onClick={addField}
              className="h-7 gap-1 text-xs text-indigo-400 hover:bg-[var(--color-bg-panel)] hover:text-indigo-300"
            >
              <Codicon name="plus" />
              Add column
            </Button>
          </div>

          <div className={`max-h-[260px] space-y-2 overflow-y-auto rounded-lg border p-2 ${fieldsContainerCls}`}>
            {fields.map((f, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] items-center gap-2"
              >
                <Input
                  value={f.name}
                  onChange={(e) => updateField(idx, { name: e.target.value })}
                  placeholder="column name"
                  className={`h-8 font-mono text-xs focus:border-indigo-500 ${fieldRowCls}`}
                />
                <select
                  value={f.type}
                  onChange={(e) => updateField(idx, { type: e.target.value })}
                  className={`h-8 rounded border px-2 font-mono text-xs focus:border-indigo-500 ${selectCls}`}
                >
                  {COMMON_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <label className="flex cursor-pointer items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                  <Checkbox
                    checked={f.isPrimaryKey}
                    onCheckedChange={(v) =>
                      updateField(idx, { isPrimaryKey: !!v, isNullable: !!v ? false : f.isNullable })
                    }
                  />
                  PK
                </label>
                <label className="flex cursor-pointer items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                  <Checkbox
                    checked={f.isUnique && !f.isPrimaryKey}
                    onCheckedChange={(v) => updateField(idx, { isUnique: !!v })}
                    disabled={f.isPrimaryKey}
                  />
                  UQ
                </label>
                <label className="flex cursor-pointer items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                  <Checkbox
                    checked={f.isNullable}
                    onCheckedChange={(v) => updateField(idx, { isNullable: !!v })}
                    disabled={f.isPrimaryKey}
                  />
                  Null
                </label>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeField(idx)}
                  className="h-7 w-7 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)] hover:text-rose-400"
                  disabled={fields.length <= 1}
                >
                  <Codicon name="trash" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)] hover:text-[var(--color-text-primary)]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={syncStatus !== 'synced'}
            className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            <Codicon name="table" />
            Create table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
