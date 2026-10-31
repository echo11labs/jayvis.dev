import type { DatabaseAST, SchemaField, SchemaTable } from '@/types/ast';
import type { SqlEngine } from '@/lib/sql-literal';
import { quoteIdent } from '@/lib/ident';

export interface SeedOptions {
  count?: number; // rows per table (default 5)
  engine?: SqlEngine; // 'sqlite' | 'postgres' (default 'sqlite')
}

export interface TableSeedResult {
  tableName: string;
  count: number;
  sql: string;
  statements: string[];
}

export interface SeedScriptResult {
  tables: TableSeedResult[];
  fullScript: string;
  totalRows: number;
}

/**
 * Topologically sort tables so parent tables appear before child tables
 * that reference them via foreign keys.
 */
export function sortTablesByDependency(ast: DatabaseAST): string[] {
  const tableNames = Object.keys(ast.tables);
  const dependencies: Record<string, Set<string>> = {};

  for (const name of tableNames) {
    dependencies[name] = new Set<string>();
  }

  // Populate dependencies from references
  for (const ref of Object.values(ast.references)) {
    // If source references target, source depends on target
    if (
      ref.sourceTable !== ref.targetTable &&
      dependencies[ref.sourceTable] &&
      tableNames.includes(ref.targetTable)
    ) {
      dependencies[ref.sourceTable].add(ref.targetTable);
    }
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const order: string[] = [];

  function visit(node: string) {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      // Cycle detected: break cycle
      return;
    }
    visiting.add(node);

    const deps = dependencies[node] ?? new Set();
    for (const dep of deps) {
      visit(dep);
    }

    visiting.delete(node);
    visited.add(node);
    order.push(node);
  }

  for (const name of tableNames) {
    if (!visited.has(name)) {
      visit(name);
    }
  }

  return order;
}

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Sam', 'Chris', 'Pat'];
const LAST_NAMES = ['Vance', 'Mercer', 'Ellis', 'Sinclair', 'Hayden', 'Novak', 'Sterling', 'Brooks'];
const CITIES = ['San Francisco', 'New York', 'London', 'Tokyo', 'Berlin', 'Toronto', 'Sydney'];
const CATEGORIES = ['Electronics', 'Home & Kitchen', 'Books', 'Apparel', 'Fitness', 'Software'];
const STATUSES = ['active', 'pending', 'completed', 'archived', 'verified'];
const ROLES = ['admin', 'member', 'owner', 'editor', 'viewer'];

function formatLiteral(value: unknown, engine: SqlEngine): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') {
    return engine === 'postgres' ? (value ? 'TRUE' : 'FALSE') : (value ? '1' : '0');
  }
  const str = String(value).replace(/'/g, "''");
  return `'${str}'`;
}

function generateFieldValue(
  field: SchemaField,
  rowIndex: number,
  tableName: string,
  parentKeyPools: Record<string, unknown[]>,
  references: Record<string, { targetTable: string; targetField: string }>,
  engine: SqlEngine,
): unknown {
  const colName = field.name.toLowerCase();
  const baseType = field.type.toLowerCase().split('(')[0].trim();

  // 1. Check if this field is a foreign key referencing an already seeded table
  const refKey = `${tableName}.${field.name}`;
  if (references[refKey]) {
    const { targetTable, targetField } = references[refKey];
    const poolKey = `${targetTable}.${targetField}`;
    const pool = parentKeyPools[poolKey];
    if (pool && pool.length > 0) {
      return pool[rowIndex % pool.length];
    }
  }

  // 2. Primary key handling
  if (field.constraints.isPrimaryKey) {
    if (baseType.includes('uuid')) {
      const hex = (rowIndex + 1).toString(16).padStart(12, '0');
      return `a0000000-0000-4000-8000-${hex}`;
    }
    return rowIndex + 1;
  }

  // 3. Realistic semantic synthesis based on column name
  if (colName.includes('email')) {
    return `user${rowIndex + 1}@example.com`;
  }
  if (colName === 'name' || colName === 'full_name') {
    const first = FIRST_NAMES[rowIndex % FIRST_NAMES.length];
    const last = LAST_NAMES[rowIndex % LAST_NAMES.length];
    return `${first} ${last}`;
  }
  if (colName === 'first_name') {
    return FIRST_NAMES[rowIndex % FIRST_NAMES.length];
  }
  if (colName === 'last_name') {
    return LAST_NAMES[rowIndex % LAST_NAMES.length];
  }
  if (colName.includes('title')) {
    return `Item Title ${rowIndex + 1}`;
  }
  if (colName.includes('slug')) {
    return `item-slug-${rowIndex + 1}`;
  }
  if (colName.includes('city')) {
    return CITIES[rowIndex % CITIES.length];
  }
  if (colName.includes('category')) {
    return CATEGORIES[rowIndex % CATEGORIES.length];
  }
  if (colName.includes('status')) {
    return STATUSES[rowIndex % STATUSES.length];
  }
  if (colName.includes('role')) {
    return ROLES[rowIndex % ROLES.length];
  }
  if (colName.includes('price') || colName.includes('amount') || colName.includes('cost')) {
    return Number((19.99 + rowIndex * 12.5).toFixed(2));
  }
  if (colName.includes('quantity') || colName.includes('count') || colName.includes('stock')) {
    return (rowIndex + 1) * 3;
  }
  if (colName.includes('score') || colName.includes('rating')) {
    return Math.min(5, 3 + (rowIndex % 3));
  }
  if (colName.includes('phone')) {
    return `+1-555-010${rowIndex}`;
  }
  if (colName.includes('avatar') || colName.includes('image') || colName.includes('url')) {
    return `https://images.example.com/item-${rowIndex + 1}.png`;
  }
  if (
    colName.includes('created_at') ||
    colName.includes('updated_at') ||
    colName.includes('timestamp') ||
    colName.includes('date') ||
    baseType.includes('date') ||
    baseType.includes('time')
  ) {
    const day = (10 + (rowIndex % 18)).toString().padStart(2, '0');
    return `2026-10-${day} 10:00:00`;
  }
  if (colName.startsWith('is_') || colName.startsWith('has_') || baseType === 'boolean' || baseType === 'bool') {
    return rowIndex % 2 === 0;
  }
  if (baseType.includes('json')) {
    return JSON.stringify({ index: rowIndex + 1, active: true, tag: 'seed' });
  }
  if (colName.includes('description') || colName.includes('content') || colName.includes('bio')) {
    return `Automated sample data entry #${rowIndex + 1} for ${tableName}.`;
  }

  // 4. Fallback by type
  if (baseType.includes('int') || baseType.includes('serial')) {
    return (rowIndex + 1) * 10;
  }
  if (baseType.includes('float') || baseType.includes('double') || baseType.includes('numeric') || baseType.includes('decimal')) {
    return Number((10.5 + rowIndex).toFixed(2));
  }
  if (baseType.includes('uuid')) {
    const hex = (rowIndex + 1).toString(16).padStart(12, '0');
    return `00000000-0000-4000-8000-${hex}`;
  }

  return `${field.name}_${rowIndex + 1}`;
}

/**
 * Generate INSERT statements for all tables in the schema.
 */
export function generateMockSeedScript(
  ast: DatabaseAST,
  options: SeedOptions = {},
): SeedScriptResult {
  const count = options.count ?? 5;
  const engine = options.engine ?? 'sqlite';

  const orderedTables = sortTablesByDependency(ast);
  const tableResults: TableSeedResult[] = [];
  const allStatements: string[] = [];

  // Map references by sourceTable.sourceField -> { targetTable, targetField }
  const refLookup: Record<string, { targetTable: string; targetField: string }> = {};
  for (const ref of Object.values(ast.references)) {
    refLookup[`${ref.sourceTable}.${ref.sourceField}`] = {
      targetTable: ref.targetTable,
      targetField: ref.targetField,
    };
  }

  // Store generated primary keys to feed into child foreign keys
  const generatedKeyPools: Record<string, unknown[]> = {};

  for (const tableName of orderedTables) {
    const table: SchemaTable | undefined = ast.tables[tableName];
    if (!table || table.fields.length === 0) continue;

    const fieldsToInsert = table.fields.filter((f) => {
      // For autoincrement integer PK in SQLite, we can still explicitly insert or omit
      return true;
    });

    const tableStatements: string[] = [];

    for (let i = 0; i < count; i += 1) {
      const rowValues: Record<string, unknown> = {};

      for (const field of fieldsToInsert) {
        const val = generateFieldValue(
          field,
          i,
          tableName,
          generatedKeyPools,
          refLookup,
          engine,
        );
        rowValues[field.name] = val;

        // Save PK in pool
        if (field.constraints.isPrimaryKey) {
          const poolKey = `${tableName}.${field.name}`;
          if (!generatedKeyPools[poolKey]) generatedKeyPools[poolKey] = [];
          generatedKeyPools[poolKey].push(val);
        }
      }

      const colNames = fieldsToInsert.map((f) => quoteIdent(f.name)).join(', ');
      const valList = fieldsToInsert
        .map((f) => formatLiteral(rowValues[f.name], engine))
        .join(', ');

      const stmt = `INSERT INTO ${quoteIdent(tableName)} (${colNames}) VALUES (${valList});`;
      tableStatements.push(stmt);
      allStatements.push(stmt);
    }

    tableResults.push({
      tableName,
      count: tableStatements.length,
      sql: tableStatements.join('\n'),
      statements: tableStatements,
    });
  }

  const header =
    engine === 'sqlite'
      ? `-- JayVis.dev — SQLite Mock Data Seed (${tableResults.length} tables, ${allStatements.length} rows)\nPRAGMA foreign_keys = ON;\n\n`
      : `-- JayVis.dev — PostgreSQL Mock Data Seed (${tableResults.length} tables, ${allStatements.length} rows)\n\n`;

  const fullScript = header + allStatements.join('\n');

  return {
    tables: tableResults,
    fullScript,
    totalRows: allStatements.length,
  };
}
