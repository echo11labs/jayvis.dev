import type { DatabaseAST, SchemaField, SchemaTable } from '@/types/ast';

function field(
  table: string,
  name: string,
  type: string,
  constraints: SchemaField['constraints'] = {},
): SchemaField {
  return { id: `${table}.${name}`, name, type, constraints };
}

function table(name: string, fields: SchemaField[], extra: Partial<SchemaTable> = {}): SchemaTable {
  return { id: name, name, fields, ...extra };
}

export function reservedWords(): DatabaseAST {
  return {
    version: '1.0',
    tables: {
      order: table('order', [
        field('order', 'group', 'text', { isPrimaryKey: true, isNullable: false }),
        field('order', 'select', 'integer'),
      ]),
    },
    references: {},
  };
}

export function cyclic(): DatabaseAST {
  return {
    version: '1.0',
    tables: {
      a: table('a', [
        field('a', 'id', 'integer', { isPrimaryKey: true, isNullable: false }),
        field('a', 'b_id', 'integer'),
      ]),
      b: table('b', [
        field('b', 'id', 'integer', { isPrimaryKey: true, isNullable: false }),
        field('b', 'a_id', 'integer'),
      ]),
    },
    references: {
      ab: {
        id: 'ab',
        sourceTable: 'a',
        sourceField: 'b_id',
        targetTable: 'b',
        targetField: 'id',
        cardinality: '1:N',
        deferrable: true,
      },
      ba: {
        id: 'ba',
        sourceTable: 'b',
        sourceField: 'a_id',
        targetTable: 'a',
        targetField: 'id',
        cardinality: '1:N',
        deferrable: true,
      },
    },
  };
}

export function emptyTable(): DatabaseAST {
  return {
    version: '1.0',
    tables: {
      bins: table('bins', [field('bins', 'id', 'integer', { isPrimaryKey: true, isNullable: false })]),
    },
    references: {},
  };
}

export function poisonedDefault(): DatabaseAST {
  return {
    version: '1.0',
    tables: {
      users: table('users', [
        field('users', 'id', 'integer', { isPrimaryKey: true, isNullable: false }),
        field('users', 'note', 'text', { defaultValue: '1); DROP TABLE users' }),
      ]),
    },
    references: {},
  };
}

export function oneTable(): DatabaseAST {
  return {
    version: '1.0',
    tables: {
      widgets: table('widgets', [
        field('widgets', 'id', 'integer', { isPrimaryKey: true, isNullable: false, isAutoincrement: true }),
        field('widgets', 'name', 'text', { isNullable: false }),
      ]),
    },
    references: {},
  };
}

export function oneTablePlusColumn(): DatabaseAST {
  const base = oneTable();
  base.tables.widgets.fields.push(
    field('widgets', 'sku', 'text', { isNullable: false, defaultValue: 'n/a' }),
  );
  return base;
}
