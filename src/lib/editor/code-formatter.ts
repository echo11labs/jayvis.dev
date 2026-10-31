import type { DatabaseAST } from '@/types/ast';
import { serializeDBML } from '@/lib/parser/dbml';

export type EditorDialect = 'dbml' | 'sql' | 'json';

export function detectDialect(fileName?: string, content?: string): EditorDialect {
  if (fileName) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.sql')) return 'sql';
    if (lower.endsWith('.json')) return 'json';
    if (lower.endsWith('.dbml')) return 'dbml';
  }

  if (content) {
    const trimmed = content.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch {
        // Not valid JSON
      }
    }
    if (/^(SELECT|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|INSERT\s+INTO|PRAGMA)\b/i.test(trimmed)) {
      return 'sql';
    }
  }

  return 'dbml';
}

const SQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'NOT',
  'IN',
  'JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'OUTER JOIN',
  'CROSS JOIN',
  'ON',
  'GROUP BY',
  'ORDER BY',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'ASC',
  'DESC',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'CREATE TABLE',
  'CREATE INDEX',
  'CREATE UNIQUE INDEX',
  'ALTER TABLE',
  'DROP TABLE',
  'PRIMARY KEY',
  'FOREIGN KEY',
  'REFERENCES',
  'CONSTRAINT',
  'NOT NULL',
  'NULL',
  'DEFAULT',
  'UNIQUE',
  'CHECK',
  'CASCADE',
  'RESTRICT',
  'PRAGMA',
  'AUTOINCREMENT',
];

export function formatSql(sql: string): string {
  let formatted = sql.trim();
  if (!formatted) return '';

  // Uppercase keywords when matching as whole words outside string literals
  for (const kw of SQL_KEYWORDS) {
    const regex = new RegExp(`(?<!['"])\\b${kw}\\b(?!['"])`, 'gi');
    formatted = formatted.replace(regex, kw);
  }

  // Ensure statements end with clean single newline
  const lines = formatted.split('\n').map((l) => l.trimEnd());
  return lines.join('\n');
}

export function formatJson(json: string): string {
  try {
    const parsed = JSON.parse(json);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return json;
  }
}

export function formatDbml(dbml: string, ast?: DatabaseAST): string {
  // If we have an AST with tables, we can re-serialize cleanly
  if (ast && Object.keys(ast.tables).length > 0) {
    try {
      const serialized = serializeDBML(ast);
      if (serialized.trim().length > 0) {
        return serialized;
      }
    } catch {
      // Fallback to text cleanup
    }
  }

  // Fallback: clean up indentations and trailing whitespace
  const lines = dbml.split('\n');
  let indent = 0;
  const formattedLines: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    let line = lines[i].trim();
    if (!line) {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
        formattedLines.push('');
      }
      continue;
    }

    if (line.startsWith('}') || line.startsWith(']')) {
      indent = Math.max(0, indent - 1);
    }

    const pad = '  '.repeat(indent);
    formattedLines.push(pad + line);

    if (line.endsWith('{') || line.endsWith('[')) {
      indent += 1;
    }
  }

  return formattedLines.join('\n');
}

export function formatCode(
  code: string,
  dialect: EditorDialect,
  ast?: DatabaseAST,
): { formatted: string; changed: boolean } {
  let formatted = code;

  if (dialect === 'json') {
    formatted = formatJson(code);
  } else if (dialect === 'sql') {
    formatted = formatSql(code);
  } else {
    formatted = formatDbml(code, ast);
  }

  return {
    formatted,
    changed: formatted !== code,
  };
}
