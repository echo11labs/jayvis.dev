import { z } from 'zod';
import type { DatabaseAST } from '@/types/ast';

const fieldConstraintSchema = z.object({
  isPrimaryKey: z.boolean().optional(),
  isUnique: z.boolean().optional(),
  isNullable: z.boolean().optional(),
  defaultValue: z.string().optional(),
  isAutoincrement: z.boolean().optional(),
});

const schemaFieldSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  constraints: fieldConstraintSchema,
  note: z.string().optional(),
});

const schemaIndexSchema = z.object({
  name: z.string().optional(),
  columns: z.array(z.string()),
  isUnique: z.boolean().optional(),
});

const schemaTableSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  schema: z.string().optional(),
  color: z.string().optional(),
  fields: z.array(schemaFieldSchema),
  indexes: z.array(schemaIndexSchema).optional(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  note: z.string().optional(),
});

const schemaReferenceSchema = z.object({
  id: z.string().min(1),
  sourceTable: z.string().min(1),
  sourceField: z.string().min(1),
  targetTable: z.string().min(1),
  targetField: z.string().min(1),
  cardinality: z.enum(['1:1', '1:N', 'N:M']),
  onDelete: z.enum(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION']).optional(),
  onUpdate: z.enum(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION']).optional(),
});

export const databaseASTSchema = z.object({
  version: z.string().min(1),
  tables: z.record(z.string(), schemaTableSchema),
  references: z.record(z.string(), schemaReferenceSchema),
});

export function isDatabaseAST(value: unknown): value is DatabaseAST {
  return databaseASTSchema.safeParse(value).success;
}

export function parseImportedAST(value: unknown): {
  ok: true;
  ast: DatabaseAST;
} | {
  ok: false;
  error: string;
} {
  const result = databaseASTSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path?.length ? issue.path.join('.') : 'ast';
    return {
      ok: false,
      error: `Invalid AST ${path}: ${issue?.message ?? 'validation failed'}`,
    };
  }
  return { ok: true, ast: result.data };
}

export function parseImportedFile(
  fileName: string,
  text: string,
): {
  kind: 'ast';
  ast: DatabaseAST;
} | {
  kind: 'dbml';
  rawText: string;
} | {
  kind: 'error';
  error: string;
} {
  const trimmed = text.trim();
  const looksLikeJson =
    fileName.toLowerCase().endsWith('.json') || trimmed.startsWith('{');

  if (fileName.toLowerCase().endsWith('.json')) {
    try {
      const parsed = JSON.parse(text);
      const ast = parseImportedAST(parsed);
      if (!ast.ok) return { kind: 'error', error: ast.error };
      return { kind: 'ast', ast: ast.ast };
    } catch {
      return { kind: 'error', error: `Could not parse ${fileName} as JSON` };
    }
  }

  if (looksLikeJson) {
    try {
      const parsed = JSON.parse(text);
      const ast = parseImportedAST(parsed);
      if (ast.ok) return { kind: 'ast', ast: ast.ast };
    } catch {
      // Fall through to DBML.
    }
  }

  if (!trimmed) {
    return { kind: 'error', error: 'Imported file is empty' };
  }

  return { kind: 'dbml', rawText: text };
}
