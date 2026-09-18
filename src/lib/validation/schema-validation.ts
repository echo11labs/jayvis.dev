/**
 * Schema validation — analyzes a DatabaseAST for common data-modeling issues
 * and returns a prioritized list of warnings/errors.
 */
import { DatabaseAST } from '@/types/ast';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  category: 'primary-key' | 'naming' | 'reference' | 'type' | 'index';
  tableName?: string;
  fieldName?: string;
  message: string;
  fix?: string;
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
        severity: 'error',
        category: 'naming',
        tableName: name,
        message: `Table "${name}" collides with "${seenTableNames.get(lower)}" (case-insensitive).`,
        fix: 'Rename one of the tables.',
      });
    } else {
      seenTableNames.set(lower, name);
    }
  }

  for (const table of Object.values(ast.tables)) {
    const hasPK = table.fields.some((f) => f.constraints.isPrimaryKey);
    if (!hasPK && table.fields.length > 0) {
      issues.push({
        id: `no-pk-${table.name}`,
        severity: 'warning',
        category: 'primary-key',
        tableName: table.name,
        message: `Table "${table.name}" has no primary key.`,
        fix: 'Add a column with [pk] or designate an existing column.',
      });
    }

    for (const f of table.fields) {
      if (seenFieldIds.has(f.id)) {
        issues.push({
          id: `dup-field-${f.id}`,
          severity: 'error',
          category: 'naming',
          tableName: table.name,
          fieldName: f.name,
          message: `Duplicate field id "${f.id}" (also in "${seenFieldIds.get(f.id)}").`,
          fix: 'Rename the column to avoid ambiguity.',
        });
      } else {
        seenFieldIds.set(f.id, table.name);
      }
    }

    const seenLocal = new Set<string>();
    for (const f of table.fields) {
      if (seenLocal.has(f.name)) {
        issues.push({
          id: `dup-col-${table.name}-${f.name}`,
          severity: 'error',
          category: 'naming',
          tableName: table.name,
          fieldName: f.name,
          message: `Column "${f.name}" appears twice in table "${table.name}".`,
          fix: 'Remove or rename the duplicate column.',
        });
      }
      seenLocal.add(f.name);
    }

    for (const f of table.fields) {
      if (f.constraints.isPrimaryKey && f.constraints.isNullable !== false) {
        issues.push({
          id: `pk-nullable-${table.name}-${f.name}`,
          severity: 'warning',
          category: 'primary-key',
          tableName: table.name,
          fieldName: f.name,
          message: `Primary key "${f.name}" on "${table.name}" is nullable — PKs are usually NOT NULL.`,
          fix: 'Add [not null] to the column.',
        });
      }
    }

    for (const f of table.fields) {
      if (f.constraints.isAutoincrement) {
        const baseType = f.type.split('(')[0];
        if (!['integer', 'bigint', 'serial', 'bigserial'].includes(baseType)) {
          issues.push({
            id: `autoinc-type-${table.name}-${f.name}`,
            severity: 'warning',
            category: 'type',
            tableName: table.name,
            fieldName: f.name,
            message: `Column "${f.name}" auto-increments but type is "${f.type}" (expected integer/bigint).`,
            fix: 'Use integer or bigint for auto-increment columns.',
          });
        }
      }
    }
  }

  for (const ref of Object.values(ast.references)) {
    const srcTable = ast.tables[ref.sourceTable];
    const tgtTable = ast.tables[ref.targetTable];
    if (!srcTable) {
      issues.push({
        id: `orphan-ref-src-${ref.id}`,
        severity: 'error',
        category: 'reference',
        message: `Relationship references missing source table "${ref.sourceTable}".`,
        fix: 'Delete the relationship or recreate the table.',
      });
    } else if (!srcTable.fields.some((f) => f.name === ref.sourceField)) {
      issues.push({
        id: `orphan-ref-src-field-${ref.id}`,
        severity: 'error',
        category: 'reference',
        tableName: ref.sourceTable,
        fieldName: ref.sourceField,
        message: `Relationship source field "${ref.sourceField}" not found in "${ref.sourceTable}".`,
        fix: 'Delete the relationship or fix the field name.',
      });
    }
    if (!tgtTable) {
      issues.push({
        id: `orphan-ref-tgt-${ref.id}`,
        severity: 'error',
        category: 'reference',
        message: `Relationship references missing target table "${ref.targetTable}".`,
        fix: 'Delete the relationship or recreate the table.',
      });
    } else if (!tgtTable.fields.some((f) => f.name === ref.targetField)) {
      issues.push({
        id: `orphan-ref-tgt-field-${ref.id}`,
        severity: 'error',
        category: 'reference',
        tableName: ref.targetTable,
        fieldName: ref.targetField,
        message: `Relationship target field "${ref.targetField}" not found in "${ref.targetTable}".`,
        fix: 'Delete the relationship or fix the field name.',
      });
    }
  }

  if (tableNames.length === 0) {
    issues.push({
      id: 'empty-schema',
      severity: 'info',
      category: 'naming',
      message: 'The schema is empty. Add a table to get started.',
      fix: 'Press ⌘T to create a table or load a sample.',
    });
  }

  return issues;
}

export function severityColor(s: ValidationSeverity): string {
  switch (s) {
    case 'error':
      return 'text-rose-400';
    case 'warning':
      return 'text-amber-400';
    case 'info':
      return 'text-sky-400';
  }
}

export function severityBg(s: ValidationSeverity): string {
  switch (s) {
    case 'error':
      return 'bg-rose-500/10 border-rose-500/20';
    case 'warning':
      return 'bg-amber-500/10 border-amber-500/20';
    case 'info':
      return 'bg-sky-500/10 border-sky-500/20';
  }
}
