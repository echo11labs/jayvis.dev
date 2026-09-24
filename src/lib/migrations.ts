import type { DatabaseAST } from '@/types/ast';
import { diffSchema, summarizeDiff } from '@/lib/diff/schema-diff';

const STORAGE_KEY = 'jayvis-migration-baselines';

export const EMPTY_BASELINE: DatabaseAST = {
  version: '1.0',
  tables: {},
  references: {},
  enums: {},
  tableGroups: {},
};

export type MigrationResult = {
  hasBaseline: boolean;
  diff: ReturnType<typeof diffSchema>;
  summary: ReturnType<typeof summarizeDiff>;
};

type BaselineRecord = {
  ast: DatabaseAST;
  capturedAt: number;
};

export function baselineSlot(workspaceId: string, branch: string) {
  return `${workspaceId}:${branch}`;
}

function readMap(): Record<string, BaselineRecord> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, BaselineRecord>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function readBaseline(slot: string): DatabaseAST | null {
  const record = readMap()[slot];
  if (!record?.ast || !record.ast.tables || !record.ast.references) return null;
  return record.ast;
}

export function writeBaseline(slot: string, ast: DatabaseAST, capturedAt = Date.now()) {
  if (typeof localStorage === 'undefined') return;
  const next = readMap();
  next[slot] = {
    ast: JSON.parse(JSON.stringify(ast)) as DatabaseAST,
    capturedAt,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

const REF_ACTIONS = new Set(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION']);

function refAction(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const upper = value.trim().toUpperCase();
  return REF_ACTIONS.has(upper) ? upper : undefined;
}

/** Coerce parser output into the AST the migration API accepts. */
export function prepareMigrationAst(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const ast = value as DatabaseAST;
  const tables = Object.fromEntries(
    Object.entries(ast.tables ?? {}).map(([name, table]) => [
      name,
      {
        ...table,
        fields: (table.fields ?? []).map((field) => ({
          ...field,
          constraints: {
            ...field.constraints,
            defaultValue:
              typeof field.constraints?.defaultValue === 'string'
                ? field.constraints.defaultValue
                : undefined,
          },
        })),
      },
    ]),
  );
  const references = Object.fromEntries(
    Object.entries(ast.references ?? {}).map(([id, ref]) => [
      id,
      {
        ...ref,
        onDelete: refAction(ref.onDelete),
        onUpdate: refAction(ref.onUpdate),
      },
    ]),
  );
  return {
    version: ast.version || '1.0',
    tables,
    references,
  };
}

export function buildMigration(
  baseline: DatabaseAST | null,
  current: DatabaseAST,
): MigrationResult {
  const diff = diffSchema(baseline ?? EMPTY_BASELINE, current);
  return {
    hasBaseline: baseline !== null,
    diff,
    summary: summarizeDiff(diff),
  };
}
