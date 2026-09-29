/**
 * JayVis.dev Core AST & Type System
 * --------------------------------
 * The DatabaseAST is the single source of truth. Code (DBML) and the
 * visual canvas both mutate / read from this structure. Every mutation
 * carries an `origin` marker so we never re-enter parsing loops.
 */

export type SQLDataType =
  | 'uuid'
  | 'text'
  | 'varchar'
  | 'integer'
  | 'bigint'
  | 'boolean'
  | 'timestamp'
  | 'timestamptz'
  | 'jsonb'
  | 'serial'
  | 'bigserial'
  | 'decimal'
  | 'numeric'
  | 'real'
  | 'date'
  | 'time'
  | 'interval'
  | string;

export interface FieldConstraint {
  isPrimaryKey?: boolean;
  isUnique?: boolean;
  isNullable?: boolean;
  defaultValue?: string;
  isAutoincrement?: boolean;
  isIdentity?: boolean;
  generated?: string;
  check?: string;
}

export interface SchemaField {
  /** `${tableName}.${fieldName}` */
  id: string;
  name: string;
  type: SQLDataType;
  constraints: FieldConstraint;
  note?: string;
}

export interface SchemaIndex {
  name?: string;
  columns: string[];
  isUnique?: boolean;
  method?: 'btree' | 'hash' | 'gin' | 'gist';
  where?: string;
}

export interface SchemaUnique {
  name?: string;
  columns: string[];
}

export interface SchemaTable {
  id: string;
  name: string;
  schema?: string;
  color?: string;
  fields: SchemaField[];
  indexes?: SchemaIndex[];
  primaryKey?: string[];
  uniques?: SchemaUnique[];
  checks?: string[];
  /** Cached canvas position, persisted so reloads keep layout. */
  position?: { x: number; y: number };
  /** Optional descriptive note rendered as a tooltip on the table header. */
  note?: string;
}

export type Cardinality = '1:1' | '1:N' | 'N:M';

export interface SchemaEnumValue {
  name: string;
  note?: string;
}

export interface SchemaEnum {
  name: string;
  values: SchemaEnumValue[];
  note?: string;
}

export interface SchemaTableGroup {
  name: string;
  tables: string[];
  note?: string;
}

export interface SchemaReference {
  id: string;
  sourceTable: string;
  sourceField: string;
  sourceFields?: string[];
  targetTable: string;
  targetField: string;
  targetFields?: string[];
  cardinality: Cardinality;
  name?: string;
  deferrable?: boolean;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface DatabaseAST {
  version: string;
  tables: Record<string, SchemaTable>;
  references: Record<string, SchemaReference>;
  enums?: Record<string, SchemaEnum>;
  tableGroups?: Record<string, SchemaTableGroup>;
}

/* ----------------------------------------------------------------------------
 * Origin tracking — prevents infinite re-render / parsing loops.
 * ------------------------------------------------------------------------- */
export type Origin = 'editor' | 'canvas' | 'remote' | 'mcp' | 'none';
export type SyncStatus =
  | 'booting'
  | 'parsing'
  | 'synced'
  | 'invalid'
  | 'offline';

/* ----------------------------------------------------------------------------
 * Diff Engine Contracts
 * ------------------------------------------------------------------------- */
export type DiffAction = 'CREATE' | 'DROP' | 'ALTER';

export interface ColumnDiff {
  action: DiffAction;
  tableName: string;
  columnName: string;
  oldField?: SchemaField;
  newField?: SchemaField;
}

export interface TableDiff {
  action: DiffAction;
  tableName: string;
  table?: SchemaTable;
  columnDiffs: ColumnDiff[];
}

export interface IndexDiff {
  action: 'CREATE' | 'DROP';
  tableName: string;
  indexName: string;
  columns: string[];
  isUnique?: boolean;
}

export interface ReferenceDiff {
  action: DiffAction;
  refId: string;
  previous?: SchemaReference;
  current?: SchemaReference;
}

export interface SchemaDiffResult {
  tables: TableDiff[];
  indexes: IndexDiff[];
  references: ReferenceDiff[];
  upSql: string[];
  downSql: string[];
}

/* ----------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */
export const emptyAST = (): DatabaseAST => ({
  version: '1.0',
  tables: {},
  references: {},
});

/** A curated palette for auto-assigning table header colors. */
export const TABLE_COLORS = [
  '#6366F1', // indigo
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EC4899', // pink
  '#8B5CF6', // violet
  '#06B6D4', // cyan
  '#EF4444', // red
  '#84CC16', // lime
  '#14B8A6', // teal
  '#F97316', // orange
];
