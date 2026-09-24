/**
 * Schema validation — analyzes a DatabaseAST for common data-modeling issues
 * and returns a prioritized list of warnings/errors.
 */
import type { DatabaseAST, SchemaField } from '@/types/ast';

export type ValidationSeverity = 'error' | 'warning' | 'info';
export type ValidationCategory = 'primary-key' | 'naming' | 'reference' | 'type' | 'index';
export type ValidationCheckStatus = 'pass' | 'fail';

export interface ValidationIssue {
  id: string;
  checkId: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  tableName?: string;
  fieldName?: string;
  refId?: string;
  message: string;
  fix?: string;
}

export interface ValidationCheck {
  id: string;
  category: ValidationCategory;
  label: string;
  status: ValidationCheckStatus;
  count: number;
}

export interface ValidationSummary {
  issues: ValidationIssue[];
  checks: ValidationCheck[];
  errors: number;
  warnings: number;
  infos: number;
}

const CHECK_CATALOG: Array<Pick<ValidationCheck, 'id' | 'category' | 'label'>> = [
  { id: 'pk-present', category: 'primary-key', label: 'Every table has a primary key' },
  { id: 'pk-not-null', category: 'primary-key', label: 'Primary keys are not nullable' },
  { id: 'snake-case-table', category: 'naming', label: 'Table names are snake_case' },
  { id: 'snake-case-column', category: 'naming', label: 'Column names are snake_case' },
  { id: 'reserved-name', category: 'naming', label: 'Names are not reserved SQL words' },
  { id: 'unique-table', category: 'naming', label: 'Table names are unique' },
  { id: 'unique-column', category: 'naming', label: 'Column names are unique' },
  { id: 'table-has-columns', category: 'naming', label: 'Tables have columns' },
  { id: 'schema-not-empty', category: 'naming', label: 'Schema has at least one table' },
  { id: 'index-columns-exist', category: 'index', label: 'Index columns exist' },
  { id: 'index-not-duplicate', category: 'index', label: 'Indexes are not duplicated' },
  { id: 'fk-indexed', category: 'index', label: 'Foreign keys are indexed' },
  { id: 'ref-endpoints-exist', category: 'reference', label: 'Relationship endpoints exist' },
  { id: 'ref-not-duplicate', category: 'reference', label: 'Relationships are not duplicated' },
  { id: 'ref-target-unique', category: 'reference', label: 'Relationship targets are unique' },
  { id: 'ref-cardinality', category: 'reference', label: 'One-to-one sources are unique' },
  { id: 'ref-set-null', category: 'reference', label: 'SET NULL targets a nullable column' },
  { id: 'ref-types-match', category: 'type', label: 'Relationship column types match' },
  { id: 'autoincrement-integer', category: 'type', label: 'Auto-increment columns are integers' },
  { id: 'known-type', category: 'type', label: 'Column types are known' },
  { id: 'enum-has-values', category: 'naming', label: 'Enums declare values' },
  { id: 'enum-values-unique', category: 'naming', label: 'Enum values are unique' },
  { id: 'group-tables-exist', category: 'reference', label: 'Table group members exist' },
];

const KNOWN_TYPES = new Set([
  'uuid',
  'text',
  'varchar',
  'integer',
  'bigint',
  'boolean',
  'timestamp',
  'timestamptz',
  'jsonb',
  'serial',
  'bigserial',
  'decimal',
  'numeric',
  'real',
  'date',
  'time',
  'interval',
]);

const RESERVED_NAMES = new Set([
  'user',
  'order',
  'table',
  'index',
  'select',
  'from',
  'where',
  'group',
  'join',
  'limit',
  'offset',
  'values',
  'column',
]);

const IDENT_RE = /^[a-z][a-z0-9_]*$/;
const SEVERITY_RANK: Record<ValidationSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

function canonicalType(type: string): string {
  const base = type.split('(')[0].toLowerCase();
  if (base === 'serial' || base === 'int' || base === 'int4') return 'integer';
  if (base === 'bigserial' || base === 'int8') return 'bigint';
  if (base === 'varchar' || base === 'character' || base === 'char') return 'text';
  if (base === 'timestamptz') return 'timestamp';
  return base;
}

function fieldLookup(fields: SchemaField[]): Map<string, SchemaField> {
  return new Map(fields.map((field) => [field.name, field]));
}

export function validateSchema(ast: DatabaseAST): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const tableNames = Object.keys(ast.tables);
  const seenFieldIds = new Map<string, string>();
  const seenTableNames = new Map<string, string>();

  for (const name of tableNames) {
    const lower = name.toLowerCase();
    if (seenTableNames.has(lower)) {
      issues.push({
        id: `dup-table-${name}`,
        checkId: 'unique-table',
        severity: 'error',
        category: 'naming',
        tableName: name,
        message: `Table "${name}" collides with "${seenTableNames.get(lower)}" (case-insensitive).`,
        fix: 'Rename one of the tables.',
      });
    } else {
      seenTableNames.set(lower, name);
    }

    if (!IDENT_RE.test(name)) {
      issues.push({
        id: `ident-table-${name}`,
        checkId: 'snake-case-table',
        severity: 'warning',
        category: 'naming',
        tableName: name,
        message: `Table "${name}" is not snake_case.`,
        fix: 'Use a lowercase identifier such as `order_items`.',
      });
    } else if (RESERVED_NAMES.has(lower)) {
      issues.push({
        id: `reserved-table-${name}`,
        checkId: 'reserved-name',
        severity: 'warning',
        category: 'naming',
        tableName: name,
        message: `Table "${name}" is a reserved SQL word.`,
        fix: 'Rename the table (for example `app_users`).',
      });
    }
  }

  for (const table of Object.values(ast.tables)) {
    if (table.fields.length === 0) {
      issues.push({
        id: `empty-table-${table.name}`,
        checkId: 'table-has-columns',
        severity: 'error',
        category: 'naming',
        tableName: table.name,
        message: `Table "${table.name}" has no columns.`,
        fix: 'Add at least one column.',
      });
    }

    const hasPK = table.fields.some((field) => field.constraints.isPrimaryKey);
    if (!hasPK && table.fields.length > 0) {
      issues.push({
        id: `no-pk-${table.name}`,
        checkId: 'pk-present',
        severity: 'warning',
        category: 'primary-key',
        tableName: table.name,
        message: `Table "${table.name}" has no primary key.`,
        fix: 'Add a column with [pk] or designate an existing column.',
      });
    }

    const fields = fieldLookup(table.fields);
    const seenLocal = new Set<string>();
    for (const field of table.fields) {
      if (seenFieldIds.has(field.id)) {
        issues.push({
          id: `dup-field-${field.id}`,
          checkId: 'unique-column',
          severity: 'error',
          category: 'naming',
          tableName: table.name,
          fieldName: field.name,
          message: `Duplicate field id "${field.id}" (also in "${seenFieldIds.get(field.id)}").`,
          fix: 'Rename the column to avoid ambiguity.',
        });
      } else {
        seenFieldIds.set(field.id, table.name);
      }

      if (seenLocal.has(field.name)) {
        issues.push({
          id: `dup-col-${table.name}-${field.name}`,
          checkId: 'unique-column',
          severity: 'error',
          category: 'naming',
          tableName: table.name,
          fieldName: field.name,
          message: `Column "${field.name}" appears twice in table "${table.name}".`,
          fix: 'Remove or rename the duplicate column.',
        });
      }
      seenLocal.add(field.name);

      if (!IDENT_RE.test(field.name)) {
        issues.push({
          id: `ident-col-${table.name}-${field.name}`,
          checkId: 'snake-case-column',
          severity: 'warning',
          category: 'naming',
          tableName: table.name,
          fieldName: field.name,
          message: `Column "${field.name}" is not snake_case.`,
          fix: 'Use a lowercase identifier such as `created_at`.',
        });
      }

      const baseType = field.type.split('(')[0].toLowerCase();
      const enumNames = new Set(
        Object.keys(ast.enums ?? {}).map((name) => name.toLowerCase()),
      );
      if (!KNOWN_TYPES.has(baseType) && !enumNames.has(baseType)) {
        issues.push({
          id: `unknown-type-${table.name}-${field.name}`,
          checkId: 'known-type',
          severity: 'warning',
          category: 'type',
          tableName: table.name,
          fieldName: field.name,
          message: `Column "${field.name}" uses unknown type "${field.type}".`,
          fix: 'Use a supported type such as integer, text, uuid, or timestamp.',
        });
      }

      if (
        field.constraints.isPrimaryKey &&
        field.constraints.isNullable === true &&
        !field.constraints.isAutoincrement
      ) {
        issues.push({
          id: `pk-nullable-${table.name}-${field.name}`,
          checkId: 'pk-not-null',
          severity: 'warning',
          category: 'primary-key',
          tableName: table.name,
          fieldName: field.name,
          message: `Primary key "${field.name}" on "${table.name}" is nullable — PKs are usually NOT NULL.`,
          fix: 'Add [not null] to the column.',
        });
      }

      if (field.constraints.isAutoincrement) {
        const baseType = field.type.split('(')[0];
        if (!['integer', 'bigint', 'serial', 'bigserial'].includes(baseType)) {
          issues.push({
            id: `autoinc-type-${table.name}-${field.name}`,
            checkId: 'autoincrement-integer',
            severity: 'warning',
            category: 'type',
            tableName: table.name,
            fieldName: field.name,
            message: `Column "${field.name}" auto-increments but type is "${field.type}" (expected integer/bigint).`,
            fix: 'Use integer or bigint for auto-increment columns.',
          });
        }
      }
    }

    const seenIndexes = new Set<string>();
    for (const index of table.indexes ?? []) {
      const missing = index.columns.filter((column) => !fields.has(column));
      if (missing.length > 0) {
        issues.push({
          id: `index-missing-${table.name}-${index.name ?? index.columns.join('-')}`,
          checkId: 'index-columns-exist',
          severity: 'error',
          category: 'index',
          tableName: table.name,
          message: `Index on "${table.name}" references missing column(s): ${missing.join(', ')}.`,
          fix: 'Update the index or restore the column.',
        });
      }
      const signature = index.columns.join(',');
      if (seenIndexes.has(signature)) {
        issues.push({
          id: `dup-index-${table.name}-${signature}`,
          checkId: 'index-not-duplicate',
          severity: 'warning',
          category: 'index',
          tableName: table.name,
          message: `Table "${table.name}" has more than one index on ${index.columns.join(', ')}.`,
          fix: 'Keep a single index for those columns.',
        });
      }
      seenIndexes.add(signature);
    }
  }

  const seenRefs = new Set<string>();
  for (const ref of Object.values(ast.references)) {
    const pair = `${ref.sourceTable}.${ref.sourceField}->${ref.targetTable}.${ref.targetField}`;
    if (seenRefs.has(pair)) {
      issues.push({
        id: `dup-ref-${ref.id}`,
        checkId: 'ref-not-duplicate',
        severity: 'warning',
        category: 'reference',
        tableName: ref.sourceTable,
        fieldName: ref.sourceField,
        refId: ref.id,
        message: `Duplicate relationship ${pair}.`,
        fix: 'Remove the extra relationship.',
      });
    }
    seenRefs.add(pair);

    const srcTable = ast.tables[ref.sourceTable];
    const tgtTable = ast.tables[ref.targetTable];
    const sourceField = srcTable?.fields.find((field) => field.name === ref.sourceField);
    if (!srcTable) {
      issues.push({
        id: `orphan-ref-src-${ref.id}`,
        checkId: 'ref-endpoints-exist',
        severity: 'error',
        category: 'reference',
        refId: ref.id,
        message: `Relationship references missing source table "${ref.sourceTable}".`,
        fix: 'Delete the relationship or recreate the table.',
      });
    } else if (!sourceField) {
      issues.push({
        id: `orphan-ref-src-field-${ref.id}`,
        checkId: 'ref-endpoints-exist',
        severity: 'error',
        category: 'reference',
        tableName: ref.sourceTable,
        fieldName: ref.sourceField,
        refId: ref.id,
        message: `Relationship source field "${ref.sourceField}" not found in "${ref.sourceTable}".`,
        fix: 'Delete the relationship or fix the field name.',
      });
    } else {
      const indexed =
        !!sourceField.constraints.isPrimaryKey ||
        (srcTable.indexes ?? []).some((index) => index.columns.includes(sourceField.name));
      if (!indexed) {
        issues.push({
          id: `fk-index-${ref.id}`,
          checkId: 'fk-indexed',
          severity: 'info',
          category: 'index',
          tableName: ref.sourceTable,
          fieldName: ref.sourceField,
          refId: ref.id,
          message: `Foreign key "${ref.sourceTable}.${ref.sourceField}" is not indexed.`,
          fix: 'Add an index on the foreign key column.',
        });
      }

      if (
        (ref.onDelete === 'SET NULL' || ref.onUpdate === 'SET NULL') &&
        sourceField.constraints.isNullable === false
      ) {
        issues.push({
          id: `set-null-${ref.id}`,
          checkId: 'ref-set-null',
          severity: 'error',
          category: 'reference',
          tableName: ref.sourceTable,
          fieldName: ref.sourceField,
          refId: ref.id,
          message: `SET NULL on "${ref.sourceTable}.${ref.sourceField}" conflicts with NOT NULL.`,
          fix: 'Make the column nullable or use RESTRICT, NO ACTION, or CASCADE.',
        });
      }

      if (
        ref.cardinality === '1:1' &&
        !sourceField.constraints.isPrimaryKey &&
        !sourceField.constraints.isUnique
      ) {
        issues.push({
          id: `cardinality-${ref.id}`,
          checkId: 'ref-cardinality',
          severity: 'warning',
          category: 'reference',
          tableName: ref.sourceTable,
          fieldName: ref.sourceField,
          refId: ref.id,
          message: `One-to-one source "${ref.sourceTable}.${ref.sourceField}" is not unique.`,
          fix: 'Mark the source column as [pk] or [unique], or use a one-to-many relationship.',
        });
      }
    }

    if (!tgtTable) {
      issues.push({
        id: `orphan-ref-tgt-${ref.id}`,
        checkId: 'ref-endpoints-exist',
        severity: 'error',
        category: 'reference',
        refId: ref.id,
        message: `Relationship references missing target table "${ref.targetTable}".`,
        fix: 'Delete the relationship or recreate the table.',
      });
    } else if (!tgtTable.fields.some((field) => field.name === ref.targetField)) {
      issues.push({
        id: `orphan-ref-tgt-field-${ref.id}`,
        checkId: 'ref-endpoints-exist',
        severity: 'error',
        category: 'reference',
        tableName: ref.targetTable,
        fieldName: ref.targetField,
        refId: ref.id,
        message: `Relationship target field "${ref.targetField}" not found in "${ref.targetTable}".`,
        fix: 'Delete the relationship or fix the field name.',
      });
    } else {
      const targetField = tgtTable.fields.find((field) => field.name === ref.targetField);
      if (
        targetField &&
        !targetField.constraints.isPrimaryKey &&
        !targetField.constraints.isUnique
      ) {
        issues.push({
          id: `fk-target-unique-${ref.id}`,
          checkId: 'ref-target-unique',
          severity: 'warning',
          category: 'reference',
          tableName: ref.targetTable,
          fieldName: ref.targetField,
          refId: ref.id,
          message: `Relationship target "${ref.targetTable}.${ref.targetField}" is not unique or a primary key.`,
          fix: 'Mark the target column as [pk] or [unique].',
        });
      }

      if (
        sourceField &&
        targetField &&
        canonicalType(sourceField.type) !== canonicalType(targetField.type)
      ) {
        issues.push({
          id: `fk-type-${ref.id}`,
          checkId: 'ref-types-match',
          severity: 'warning',
          category: 'type',
          tableName: ref.sourceTable,
          fieldName: ref.sourceField,
          refId: ref.id,
          message: `Relationship types differ: ${ref.sourceTable}.${ref.sourceField} (${sourceField.type}) vs ${ref.targetTable}.${ref.targetField} (${targetField.type}).`,
          fix: 'Use matching column types on both ends.',
        });
      }
    }
  }

  for (const item of Object.values(ast.enums ?? {})) {
    if (item.values.length === 0) {
      issues.push({
        id: `enum-empty-${item.name}`,
        checkId: 'enum-has-values',
        severity: 'warning',
        category: 'naming',
        message: `Enum "${item.name}" has no values.`,
        fix: 'Add at least one enum value.',
      });
    }
    const seen = new Set<string>();
    for (const value of item.values) {
      const key = value.name.toLowerCase();
      if (seen.has(key)) {
        issues.push({
          id: `enum-dup-${item.name}-${value.name}`,
          checkId: 'enum-values-unique',
          severity: 'error',
          category: 'naming',
          message: `Enum "${item.name}" repeats value "${value.name}".`,
          fix: 'Keep each enum value once.',
        });
      } else {
        seen.add(key);
      }
    }
  }

  for (const group of Object.values(ast.tableGroups ?? {})) {
    for (const name of group.tables) {
      if (ast.tables[name]) continue;
      issues.push({
        id: `group-missing-${group.name}-${name}`,
        checkId: 'group-tables-exist',
        severity: 'error',
        category: 'reference',
        message: `Table group "${group.name}" lists unknown table "${name}".`,
        fix: 'Use a table that exists in the schema.',
      });
    }
  }

  if (tableNames.length === 0) {
    issues.push({
      id: 'empty-schema',
      checkId: 'schema-not-empty',
      severity: 'info',
      category: 'naming',
      message: 'The schema is empty. Add a table to get started.',
      fix: 'Press ⌘T to create a table or load a sample.',
    });
  }

  return issues.sort((left, right) => {
    const rank = SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
    if (rank !== 0) return rank;
    return left.message.localeCompare(right.message);
  });
}

export function summarizeValidation(ast: DatabaseAST): ValidationSummary {
  const issues = validateSchema(ast);
  const counts = new Map<string, number>();
  for (const issue of issues) {
    counts.set(issue.checkId, (counts.get(issue.checkId) ?? 0) + 1);
  }
  return {
    issues,
    checks: CHECK_CATALOG.map((check) => {
      const count = counts.get(check.id) ?? 0;
      return {
        ...check,
        count,
        status: count > 0 ? 'fail' : 'pass',
      };
    }),
    errors: issues.filter((issue) => issue.severity === 'error').length,
    warnings: issues.filter((issue) => issue.severity === 'warning').length,
    infos: issues.filter((issue) => issue.severity === 'info').length,
  };
}

export function tableIssueSeverity(
  issues: ValidationIssue[],
  tableName: string,
): ValidationSeverity | null {
  const related = issues.filter(
    (issue) => issue.tableName === tableName && issue.severity !== 'info',
  );
  if (related.some((issue) => issue.severity === 'error')) return 'error';
  if (related.some((issue) => issue.severity === 'warning')) return 'warning';
  return null;
}

export function severityColor(s: ValidationSeverity): string {
  switch (s) {
    case 'error':
      return 'text-[var(--color-accent-danger)]';
    case 'warning':
      return 'text-[var(--color-accent-warning)]';
    case 'info':
      return 'text-[var(--color-accent-info)]';
  }
}

export function severityBg(s: ValidationSeverity): string {
  switch (s) {
    case 'error':
      return 'bg-[var(--color-accent-danger)]/10 border-[var(--color-accent-danger)]/20';
    case 'warning':
      return 'bg-[var(--color-accent-warning)]/10 border-[var(--color-accent-warning)]/20';
    case 'info':
      return 'bg-[var(--color-accent-info)]/10 border-[var(--color-accent-info)]/20';
  }
}
