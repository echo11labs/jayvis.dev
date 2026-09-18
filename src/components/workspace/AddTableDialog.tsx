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
import { useTheme } from '@/hooks/use-theme-state';
import { Plus, Trash2, Table2 } from 'lucide-react';
import { useDiagramStore } from '@/store/diagram-store';
import type { SchemaField, SchemaTable } from '@/types/ast';
import { toast } from 'sonner';

interface AddTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FieldDraft {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
}

const COMMON_TYPES = [
  'uuid', 'integer', 'bigint', 'varchar', 'text', 'boolean',
  'timestamp', 'timestamptz', 'jsonb', 'decimal', 'serial',
];

const DEFAULT_FIELDS: FieldDraft[] = [
  { name: 'id', type: 'integer', isPrimaryKey: true, isNullable: false },
  { name: 'created_at', type: 'timestamptz', isPrimaryKey: false, isNullable: false },
];

export function AddTableDialog({ open, onOpenChange }: AddTableDialogProps) {
  const addTable = useDiagramStore((s) => s.addTable);
  const theme = useTheme();
  const isDark = theme === 'dark';
  const dialogCls = isDark
    ? 'border-zinc-800 bg-zinc-950 text-zinc-100'
    : 'border-zinc-200 bg-white text-zinc-900';
  const descCls = isDark ? 'text-zinc-500' : 'text-zinc-500';
  const inputCls = isDark
    ? 'border-zinc-800 bg-zinc-900 font-mono text-sm text-zinc-100 focus:border-indigo-500'
    : 'border-zinc-300 bg-white font-mono text-sm text-zinc-900 focus:border-indigo-500';
  const fieldRowCls = isDark ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-300 bg-white';
  const selectCls = isDark ? 'border-zinc-800 bg-zinc-950 text-zinc-100' : 'border-zinc-300 bg-white text-zinc-900';
  const fieldsContainerCls = isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-zinc-50';
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
      { name: '', type: 'varchar', isPrimaryKey: false, isNullable: true },
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
    const name = tableName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!name) {
      toast.error('Table name is required');
      return;
    }
    if (useDiagramStore.getState().ast.tables[name]) {
      toast.error(`Table "${name}" already exists`);
      return;
    }

    const validFields = fields.filter((f) => f.name.trim());
    if (validFields.length === 0) {
      toast.error('At least one column is required');
      return;
    }

    const schemaFields: SchemaField[] = validFields.map((f) => ({
      id: `${name}.${f.name.trim()}`,
      name: f.name.trim(),
      type: f.type.trim() || 'varchar',
      constraints: {
        isPrimaryKey: f.isPrimaryKey,
        isNullable: f.isNullable,
      },
    }));

    const table: SchemaTable = {
      id: name,
      name,
      schema: schema.trim() || 'public',
      fields: schemaFields,
      position: {
        x: 80 + Math.random() * 120,
        y: 80 + Math.random() * 120,
      },
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
            <Table2 className="h-4 w-4 text-indigo-400" />
            Create Table
          </DialogTitle>
          <DialogDescription className={descCls}>
            Add a new table to the schema. It will appear on the canvas and
            sync to the DBML editor instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="table-name" className="text-xs text-zinc-400">
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
            <Label htmlFor="schema-name" className="text-xs text-zinc-400">
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
            <Label className="text-xs text-zinc-400">Columns</Label>
            <Button
              size="sm"
              variant="ghost"
              onClick={addField}
              className="h-7 gap-1 text-xs text-indigo-400 hover:bg-zinc-800 hover:text-indigo-300"
            >
              <Plus className="h-3.5 w-3.5" />
              Add column
            </Button>
          </div>

          <div className={`max-h-[260px] space-y-2 overflow-y-auto rounded-lg border p-2 ${fieldsContainerCls}`}>
            {fields.map((f, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-2"
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
                <label className="flex cursor-pointer items-center gap-1 text-[10px] text-zinc-500">
                  <Checkbox
                    checked={f.isPrimaryKey}
                    onCheckedChange={(v) =>
                      updateField(idx, { isPrimaryKey: !!v, isNullable: !!v ? false : f.isNullable })
                    }
                  />
                  PK
                </label>
                <label className="flex cursor-pointer items-center gap-1 text-[10px] text-zinc-500">
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
                  className="h-7 w-7 text-zinc-600 hover:bg-zinc-800 hover:text-rose-400"
                  disabled={fields.length <= 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-500"
          >
            <Table2 className="h-4 w-4" />
            Create table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
