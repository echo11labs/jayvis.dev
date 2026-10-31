import type { SchemaField, SchemaIndex, SchemaReference } from '@/types/ast';
import { quoteIdent } from '@/lib/ident';

export type SqlEngine = 'sqlite' | 'postgres';

export const SQL_ENGINE_KEY = 'jayvis-sql-engine';

export class SqlBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SqlBuildError';
  }
}

export const KNOWN_TYPES = new Set([
  // Character / String
  'uuid',
  'text',
  'varchar',
  'character varying',
  'nvarchar',
  'varchar2',
  'char',
  'character',
  'bpchar',
  'nchar',
  'tinytext',
  'mediumtext',
  'longtext',
  'clob',

  // Integer
  'integer',
  'int',
  'int4',
  'smallint',
  'int2',
  'tinyint',
  'mediumint',
  'bigint',
  'int8',
  'serial',
  'bigserial',
  'smallserial',

  // Boolean
  'boolean',
  'bool',
  'bit',
  'varbit',

  // Date / Time
  'timestamp',
  'timestamptz',
  'datetime',
  'datetime2',
  'date',
  'time',
  'timetz',
  'interval',

  // JSON / Binary / Objects
  'jsonb',
  'json',
  'bytea',
  'blob',
  'binary',
  'varbinary',

  // Numeric / Float
  'decimal',
  'numeric',
  'number',
  'money',
  'smallmoney',
  'real',
  'float',
  'float4',
  'float8',
  'double',
  'double precision',

  // Network / Vector / Geography
  'inet',
  'cidr',
  'macaddr',
  'vector',
  'geometry',
  'geography',
]);

export function baseType(type: string): string {
  const withoutArray = type.replace(/\[\s*\d*\s*\]$/g, '').trim();
  return withoutArray.split('(')[0].trim().toLowerCase();
}

export function sqlDefault(engine: SqlEngine, value: string): string {
  const trimmed = value.trim();
  const bare = trimmed.replace(/^['"]|['"]$/g, '').toLowerCase();
  if (bare === 'now()' || bare === 'current_timestamp') {
    return engine === 'sqlite' ? "(datetime('now'))" : 'CURRENT_TIMESTAMP';
  }
  if (bare === 'null') return 'NULL';
  if (bare === 'true') return engine === 'sqlite' ? '1' : 'TRUE';
  if (bare === 'false') return engine === 'sqlite' ? '0' : 'FALSE';
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed;
  if (/^'(?:[^']|'')*'$/.test(trimmed)) return trimmed;
  const literal = trimmed.replace(/^['"]|['"]$/g, '').replace(/'/g, "''");
  return `'${literal}'`;
}

export function assertExpression(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes(';') || trimmed.includes('--') || trimmed.includes('/*')) {
    throw new SqlBuildError(`${label} cannot close the statement`);
  }
  return trimmed;
}

export type StoredType = { sql: string; note: string | null };

export function storedType(
  engine: SqlEngine,
  type: string,
  column: string,
  enumNames: ReadonlySet<string> = new Set(),
): StoredType {
  const raw = type.trim();

  // Guard against statement-closing injection or destructive delimiters
  if (raw.includes(';') || raw.includes('--') || raw.includes('/*')) {
    throw new SqlBuildError(`Column "${column}" contains invalid characters in type "${type}".`);
  }

  const base = baseType(raw);

  // 1. Registered Enums or Domain Types
  if (enumNames.has(raw) || enumNames.has(base)) {
    if (engine === 'postgres') return { sql: quoteIdent(raw), note: null };
    return { sql: 'TEXT', note: `${column} ${raw} stored as TEXT` };
  }

  // 2. Array Types (e.g., text[], integer[], varchar(255)[])
  if (raw.endsWith('[]')) {
    const itemType = raw.slice(0, -2).trim();
    if (engine === 'postgres') {
      const itemStored = storedType(engine, itemType, column, enumNames);
      return { sql: `${itemStored.sql}[]`, note: null };
    }
    return { sql: 'TEXT', note: `${column} ${raw} stored as TEXT (array)` };
  }

  // 3. PostgreSQL Engine
  if (engine === 'postgres') {
    // Parameterized SQL types: char(3), varchar(255), decimal(10,2), numeric(12,4), bit(8), vector(1536), time(6), etc.
    if (
      /^(char|character|bpchar|nchar|varchar|character\s+varying|nvarchar|varchar2|decimal|numeric|number|bit|varbit|vector|time|timetz|timestamp|timestamptz)\s*\(\s*\d+\s*(,\s*\d+\s*)?\)$/i.test(
        raw,
      )
    ) {
      const normalized = raw
        .replace(/\s+/g, ' ')
        .replace(/\s*\(\s*/, '(')
        .replace(/\s*,\s*/, ', ')
        .replace(/\s*\)/, ')');
      return { sql: normalized, note: null };
    }

    const pgMap: Record<string, string> = {
      // Integers
      int: 'integer',
      integer: 'integer',
      int4: 'integer',
      smallint: 'smallint',
      int2: 'smallint',
      tinyint: 'smallint',
      mediumint: 'integer',
      bigint: 'bigint',
      int8: 'bigint',
      serial: 'serial',
      bigserial: 'bigserial',
      smallserial: 'smallserial',

      // Float / Numeric
      float: 'double precision',
      float8: 'double precision',
      float4: 'real',
      real: 'real',
      double: 'double precision',
      'double precision': 'double precision',
      numeric: 'numeric',
      decimal: 'numeric',
      number: 'numeric',
      money: 'numeric',
      smallmoney: 'numeric',

      // Character / String
      char: 'char',
      character: 'character',
      bpchar: 'char',
      nchar: 'char',
      varchar: 'varchar',
      'character varying': 'varchar',
      nvarchar: 'varchar',
      varchar2: 'varchar',
      text: 'text',
      tinytext: 'text',
      mediumtext: 'text',
      longtext: 'text',
      clob: 'text',
      citext: 'citext',

      // Boolean
      boolean: 'boolean',
      bool: 'boolean',
      bit: 'bit',
      varbit: 'varbit',

      // Date / Time
      date: 'date',
      time: 'time',
      timetz: 'timetz',
      timestamp: 'timestamp',
      timestamptz: 'timestamptz',
      datetime: 'timestamp',
      datetime2: 'timestamp',
      interval: 'interval',

      // JSON / Binary / Objects / Network
      json: 'json',
      jsonb: 'jsonb',
      uuid: 'uuid',
      bytea: 'bytea',
      blob: 'bytea',
      binary: 'bytea',
      varbinary: 'bytea',
      inet: 'inet',
      cidr: 'cidr',
      macaddr: 'macaddr',
      vector: 'vector',
      geometry: 'geometry',
      geography: 'geography',
    };

    if (pgMap[base]) {
      return { sql: pgMap[base], note: null };
    }

    // Graceful fallback for custom domain/types or unlisted enums: preserve raw type safely without crashing
    if (/^[a-zA-Z_][a-zA-Z0-9_]*(\s*\([^)]*\))?$/i.test(raw)) {
      return { sql: raw, note: null };
    }

    return { sql: 'text', note: `${column} unknown type "${raw}" defaulted to text` };
  }

  // 4. SQLite Engine (Type Affinity Mapping)
  const sqliteMap: Record<string, StoredType> = {
    // Integer affinity
    int: { sql: 'INTEGER', note: null },
    integer: { sql: 'INTEGER', note: null },
    int2: { sql: 'INTEGER', note: `${column} int2 stored as INTEGER` },
    int4: { sql: 'INTEGER', note: null },
    int8: { sql: 'INTEGER', note: `${column} int8 stored as INTEGER` },
    tinyint: { sql: 'INTEGER', note: `${column} tinyint stored as INTEGER` },
    smallint: { sql: 'INTEGER', note: `${column} smallint stored as INTEGER` },
    mediumint: { sql: 'INTEGER', note: `${column} mediumint stored as INTEGER` },
    bigint: { sql: 'INTEGER', note: `${column} bigint stored as INTEGER` },
    serial: { sql: 'INTEGER', note: `${column} serial stored as INTEGER` },
    bigserial: { sql: 'INTEGER', note: `${column} bigserial stored as INTEGER` },
    smallserial: { sql: 'INTEGER', note: `${column} smallserial stored as INTEGER` },
    boolean: { sql: 'INTEGER', note: `${column} boolean stored as INTEGER` },
    bool: { sql: 'INTEGER', note: `${column} boolean stored as INTEGER` },
    bit: { sql: 'INTEGER', note: `${column} bit stored as INTEGER` },

    // Real affinity
    real: { sql: 'REAL', note: null },
    float: { sql: 'REAL', note: `${column} float stored as REAL` },
    float4: { sql: 'REAL', note: `${column} float4 stored as REAL` },
    float8: { sql: 'REAL', note: `${column} float8 stored as REAL` },
    double: { sql: 'REAL', note: `${column} double stored as REAL` },
    'double precision': { sql: 'REAL', note: `${column} double precision stored as REAL` },

    // Numeric affinity
    decimal: { sql: 'NUMERIC', note: `${column} decimal stored as NUMERIC` },
    numeric: { sql: 'NUMERIC', note: `${column} numeric stored as NUMERIC` },
    number: { sql: 'NUMERIC', note: `${column} number stored as NUMERIC` },
    money: { sql: 'NUMERIC', note: `${column} money stored as NUMERIC` },
    smallmoney: { sql: 'NUMERIC', note: `${column} smallmoney stored as NUMERIC` },

    // Text affinity
    text: { sql: 'TEXT', note: null },
    tinytext: { sql: 'TEXT', note: null },
    mediumtext: { sql: 'TEXT', note: null },
    longtext: { sql: 'TEXT', note: null },
    clob: { sql: 'TEXT', note: null },
    varchar: { sql: 'TEXT', note: `${column} ${raw} stored as TEXT` },
    'character varying': { sql: 'TEXT', note: `${column} ${raw} stored as TEXT` },
    nvarchar: { sql: 'TEXT', note: `${column} ${raw} stored as TEXT` },
    varchar2: { sql: 'TEXT', note: `${column} ${raw} stored as TEXT` },
    char: { sql: 'TEXT', note: `${column} ${raw} stored as TEXT` },
    character: { sql: 'TEXT', note: `${column} ${raw} stored as TEXT` },
    bpchar: { sql: 'TEXT', note: `${column} ${raw} stored as TEXT` },
    nchar: { sql: 'TEXT', note: `${column} ${raw} stored as TEXT` },
    citext: { sql: 'TEXT', note: `${column} citext stored as TEXT` },
    uuid: { sql: 'TEXT', note: `${column} uuid stored as TEXT` },
    json: { sql: 'TEXT', note: `${column} json stored as TEXT` },
    jsonb: { sql: 'TEXT', note: `${column} jsonb stored as TEXT` },
    date: { sql: 'TEXT', note: `${column} date stored as TEXT` },
    time: { sql: 'TEXT', note: `${column} time stored as TEXT` },
    timetz: { sql: 'TEXT', note: `${column} timetz stored as TEXT` },
    timestamp: { sql: 'TEXT', note: `${column} timestamp stored as TEXT` },
    timestamptz: { sql: 'TEXT', note: `${column} timestamptz stored as TEXT` },
    datetime: { sql: 'TEXT', note: `${column} datetime stored as TEXT` },
    datetime2: { sql: 'TEXT', note: `${column} datetime2 stored as TEXT` },
    interval: { sql: 'TEXT', note: `${column} interval stored as TEXT` },
    inet: { sql: 'TEXT', note: `${column} inet stored as TEXT` },
    cidr: { sql: 'TEXT', note: `${column} cidr stored as TEXT` },
    macaddr: { sql: 'TEXT', note: `${column} macaddr stored as TEXT` },
    vector: { sql: 'TEXT', note: `${column} vector stored as TEXT` },

    // Blob affinity
    blob: { sql: 'BLOB', note: null },
    bytea: { sql: 'BLOB', note: `${column} bytea stored as BLOB` },
    binary: { sql: 'BLOB', note: `${column} binary stored as BLOB` },
    varbinary: { sql: 'BLOB', note: `${column} varbinary stored as BLOB` },
    geometry: { sql: 'BLOB', note: `${column} geometry stored as BLOB` },
    geography: { sql: 'BLOB', note: `${column} geography stored as BLOB` },
  };

  if (sqliteMap[base]) {
    return sqliteMap[base];
  }

  // SQLite standard dynamic affinity rules for custom/unknown types
  const u = base.toUpperCase();
  if (u.includes('INT')) {
    return { sql: 'INTEGER', note: `${column} ${raw} stored as INTEGER` };
  }
  if (u.includes('CHAR') || u.includes('CLOB') || u.includes('TEXT')) {
    return { sql: 'TEXT', note: `${column} ${raw} stored as TEXT` };
  }
  if (u.includes('BLOB') || u.includes('BYTE')) {
    return { sql: 'BLOB', note: `${column} ${raw} stored as BLOB` };
  }
  if (u.includes('REAL') || u.includes('FLOA') || u.includes('DOUB')) {
    return { sql: 'REAL', note: `${column} ${raw} stored as REAL` };
  }

  return { sql: 'TEXT', note: `${column} ${raw} stored as TEXT` };
}

export function refColumns(ref: SchemaReference, side: 'source' | 'target'): string[] {
  const many = side === 'source' ? ref.sourceFields : ref.targetFields;
  if (many && many.length > 0) return many;
  return [side === 'source' ? ref.sourceField : ref.targetField];
}

export function columnSql(
  engine: SqlEngine,
  field: SchemaField,
  enumNames: ReadonlySet<string> = new Set(),
  inlinePrimary = true,
): { sql: string; note: string | null } {
  const stored = storedType(engine, field.type, field.name, enumNames);
  const identity = field.constraints.isIdentity || field.constraints.isAutoincrement;
  let typeSql = stored.sql;
  if (engine === 'postgres' && identity && (baseType(field.type) === 'integer' || baseType(field.type) === 'serial' || baseType(field.type) === 'int')) {
    typeSql = field.constraints.isIdentity ? 'integer GENERATED BY DEFAULT AS IDENTITY' : 'SERIAL';
  }
  if (engine === 'postgres' && identity && (baseType(field.type) === 'bigint' || baseType(field.type) === 'bigserial')) {
    typeSql = field.constraints.isIdentity ? 'bigint GENERATED BY DEFAULT AS IDENTITY' : 'BIGSERIAL';
  }
  if (engine === 'sqlite' && identity && (stored.sql === 'INTEGER' || baseType(field.type) === 'integer' || baseType(field.type) === 'bigint' || baseType(field.type) === 'serial' || baseType(field.type) === 'bigserial')) {
    typeSql = 'INTEGER PRIMARY KEY AUTOINCREMENT';
  }
  const parts = [quoteIdent(field.name), typeSql];
  if (inlinePrimary && field.constraints.isPrimaryKey && !typeSql.includes('PRIMARY KEY')) {
    parts.push('PRIMARY KEY');
  }
  if (field.constraints.isUnique && !field.constraints.isPrimaryKey) parts.push('UNIQUE');
  if (field.constraints.isNullable === false && !field.constraints.isPrimaryKey && !typeSql.includes('PRIMARY KEY')) {
    parts.push('NOT NULL');
  }
  if (field.constraints.defaultValue && !identity) {
    parts.push(`DEFAULT ${sqlDefault(engine, field.constraints.defaultValue)}`);
  }
  if (field.constraints.generated) {
    const expr = assertExpression(field.constraints.generated, `Generated value on "${field.name}"`);
    parts.push(`GENERATED ALWAYS AS (${expr}) STORED`);
  }
  if (field.constraints.check) {
    parts.push(`CHECK (${assertExpression(field.constraints.check, `Check on "${field.name}"`)})`);
  }
  return { sql: parts.join(' '), note: stored.note };
}

export function indexSql(engine: SqlEngine, table: string, index: SchemaIndex): { sql: string; note: string | null } {
  const cols = index.columns.map((column) => quoteIdent(column)).join(', ');
  const unique = index.isUnique ? 'UNIQUE ' : '';
  const name = index.name || `idx_${table}_${index.columns.join('_')}`;
  let sql = `CREATE ${unique}INDEX ${quoteIdent(name)} ON ${quoteIdent(table)} (${cols})`;
  let note: string | null = null;
  if (index.method) {
    if (engine === 'postgres') sql += ` USING ${index.method.toUpperCase()}`;
    else note = `${name} index method ${index.method} is not stored on SQLite`;
  }
  if (index.where) sql += ` WHERE ${assertExpression(index.where, `Index ${name}`)}`;
  return { sql: `${sql};`, note };
}

export function foreignKeySql(engine: SqlEngine, ref: SchemaReference): string {
  const source = refColumns(ref, 'source').map((column) => quoteIdent(column)).join(', ');
  const target = refColumns(ref, 'target').map((column) => quoteIdent(column)).join(', ');
  const name = ref.name || `fk_${ref.sourceTable}_${refColumns(ref, 'source').join('_')}`;
  const parts = [
    engine === 'sqlite'
      ? `FOREIGN KEY (${source}) REFERENCES ${quoteIdent(ref.targetTable)} (${target})`
      : `ALTER TABLE ${quoteIdent(ref.sourceTable)} ADD CONSTRAINT ${quoteIdent(name)} FOREIGN KEY (${source}) REFERENCES ${quoteIdent(ref.targetTable)} (${target})`,
  ];
  if (ref.onDelete) parts.push(`ON DELETE ${ref.onDelete.toUpperCase()}`);
  if (ref.onUpdate) parts.push(`ON UPDATE ${ref.onUpdate.toUpperCase()}`);
  if (ref.deferrable) parts.push('DEFERRABLE INITIALLY DEFERRED');
  const sql = parts.join(' ');
  return engine === 'sqlite' ? sql : `${sql};`;
}

export function enumNamesOf(enums: Record<string, { name: string }> | undefined): Set<string> {
  return new Set(Object.values(enums ?? {}).map((item) => item.name));
}
