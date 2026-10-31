import { describe, it, expect } from 'vitest';
import {
  detectDialect,
  formatCode,
  formatJson,
  formatSql,
} from '@/lib/editor/code-formatter';

describe('detectDialect', () => {
  it('detects from filename extension', () => {
    expect(detectDialect('schema.dbml')).toBe('dbml');
    expect(detectDialect('migration.sql')).toBe('sql');
    expect(detectDialect('ast.json')).toBe('json');
  });

  it('detects from raw content when filename is generic', () => {
    expect(detectDialect('notes.txt', '{"name": "test"}')).toBe('json');
    expect(detectDialect('notes.txt', 'SELECT * FROM users;')).toBe('sql');
    expect(detectDialect('notes.txt', 'Table users { id int }')).toBe('dbml');
  });
});

describe('formatJson', () => {
  it('indents JSON strings with 2 spaces', () => {
    const raw = '{"a":1,"b":[2,3]}';
    const formatted = formatJson(raw);
    expect(formatted).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
  });

  it('returns original text if JSON is malformed', () => {
    const raw = '{bad json';
    expect(formatJson(raw)).toBe(raw);
  });
});

describe('formatSql', () => {
  it('uppercases keywords without mutating table/column identifiers', () => {
    const raw = 'select id, name from users where status = "active" limit 10;';
    const formatted = formatSql(raw);
    expect(formatted).toContain('SELECT id, name FROM users WHERE status = "active" LIMIT 10;');
  });
});

describe('formatCode', () => {
  it('reports changed: true when formatting produces differences', () => {
    const res = formatCode('{"a":1}', 'json');
    expect(res.changed).toBe(true);
    expect(res.formatted).toContain('{\n  "a": 1\n}');
  });

  it('reports changed: false when code is already formatted', () => {
    const res = formatCode('{\n  "a": 1\n}', 'json');
    expect(res.changed).toBe(false);
  });
});
