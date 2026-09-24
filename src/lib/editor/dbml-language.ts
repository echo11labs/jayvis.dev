import type { DatabaseAST } from '@/types/ast';
import type { ValidationIssue } from '@/lib/validation/schema-validation';

export type TokenKind =
  | 'comment'
  | 'string'
  | 'keyword'
  | 'type'
  | 'setting'
  | 'number'
  | 'ident'
  | 'punct'
  | 'space';

export interface Token {
  kind: TokenKind;
  value: string;
  start: number;
  end: number;
}

export type CompletionKind =
  | 'keyword'
  | 'type'
  | 'table'
  | 'column'
  | 'setting'
  | 'snippet';

export interface Completion {
  label: string;
  kind: CompletionKind;
  detail: string;
  insert: string;
}

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface Diagnostic {
  from: number;
  to: number;
  line: number;
  severity: DiagnosticSeverity;
  message: string;
  source: 'syntax' | 'parse' | 'schema';
}

export const DBML_KEYWORDS = [
  'Table',
  'Ref',
  'Enum',
  'TableGroup',
  'Project',
  'Note',
  'indexes',
] as const;

export const DBML_TYPES = [
  'uuid',
  'text',
  'varchar',
  'char',
  'integer',
  'int',
  'bigint',
  'boolean',
  'bool',
  'timestamp',
  'timestamptz',
  'jsonb',
  'json',
  'serial',
  'bigserial',
  'decimal',
  'numeric',
  'real',
  'float',
  'double',
  'date',
  'time',
  'interval',
] as const;

export const DBML_SETTINGS = [
  'pk',
  'unique',
  'not null',
  'increment',
  'default',
  'note',
  'ref',
  'delete: cascade',
  'delete: restrict',
  'delete: set null',
  'delete: no action',
  'update: cascade',
  'update: restrict',
  'update: set null',
] as const;

const KEYWORD_SET = new Set<string>(DBML_KEYWORDS.map((word) => word.toLowerCase()));
const TYPE_SET = new Set<string>(DBML_TYPES);
const SETTING_WORDS = new Set([
  'pk',
  'primary',
  'key',
  'unique',
  'not',
  'null',
  'increment',
  'default',
  'note',
  'ref',
  'delete',
  'update',
  'cascade',
  'restrict',
  'set',
  'no',
  'action',
]);

export function classifyWord(word: string): TokenKind {
  const lower = word.toLowerCase();
  if (KEYWORD_SET.has(lower) || word === 'Note') return 'keyword';
  if (TYPE_SET.has(lower)) return 'type';
  if (SETTING_WORDS.has(lower)) return 'setting';
  return 'ident';
}

export function tokenizeDbml(doc: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const push = (kind: TokenKind, start: number, end: number) => {
    tokens.push({ kind, value: doc.slice(start, end), start, end });
  };

  while (i < doc.length) {
    const ch = doc[i];

    if (ch === '/' && doc[i + 1] === '/') {
      const start = i;
      i += 2;
      while (i < doc.length && doc[i] !== '\n') i += 1;
      push('comment', start, i);
      continue;
    }

    if (ch === '/' && doc[i + 1] === '*') {
      const start = i;
      i += 2;
      while (i < doc.length && !(doc[i] === '*' && doc[i + 1] === '/')) i += 1;
      i = Math.min(doc.length, i + 2);
      push('comment', start, i);
      continue;
    }

    if (ch === "'" || ch === '"') {
      const quote = ch;
      const start = i;
      i += 1;
      while (i < doc.length && doc[i] !== quote) {
        if (doc[i] === '\\') i += 2;
        else i += 1;
      }
      if (i < doc.length) i += 1;
      push('string', start, i);
      continue;
    }

    if (/\s/.test(ch)) {
      const start = i;
      while (i < doc.length && /\s/.test(doc[i])) i += 1;
      push('space', start, i);
      continue;
    }

    if (/[0-9]/.test(ch)) {
      const start = i;
      while (i < doc.length && /[0-9.]/.test(doc[i])) i += 1;
      push('number', start, i);
      continue;
    }

    if (/[{}\[\]()<>:,.\-]/.test(ch)) {
      const start = i;
      i += 1;
      push('punct', start, i);
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      const start = i;
      i += 1;
      while (i < doc.length && /[A-Za-z0-9_]/.test(doc[i])) i += 1;
      push(classifyWord(doc.slice(start, i)), start, i);
      continue;
    }

    push('punct', i, i + 1);
    i += 1;
  }

  return tokens;
}

function tokenAt(tokens: Token[], pos: number): Token | undefined {
  return tokens.find((token) => pos > token.start && pos <= token.end);
}

function lineStart(doc: string, pos: number): number {
  return doc.lastIndexOf('\n', pos - 1) + 1;
}

function lineEnd(doc: string, pos: number): number {
  const next = doc.indexOf('\n', pos);
  return next === -1 ? doc.length : next;
}

export function offsetToLine(doc: string, pos: number): number {
  let line = 1;
  for (let i = 0; i < pos && i < doc.length; i += 1) {
    if (doc[i] === '\n') line += 1;
  }
  return line;
}

export function lineBounds(doc: string, line: number): { from: number; to: number } {
  let current = 1;
  let from = 0;
  while (current < line && from < doc.length) {
    const next = doc.indexOf('\n', from);
    if (next === -1) return { from: doc.length, to: doc.length };
    from = next + 1;
    current += 1;
  }
  return { from, to: lineEnd(doc, from) };
}

function currentWord(doc: string, pos: number): { prefix: string; from: number } {
  const start = doc.slice(0, pos).search(/[A-Za-z_][A-Za-z0-9_]*$/);
  if (start < 0) return { prefix: '', from: pos };
  return { prefix: doc.slice(start, pos), from: start };
}

function inStringOrComment(tokens: Token[], pos: number): boolean {
  const token = tokenAt(tokens, pos);
  return token?.kind === 'string' || token?.kind === 'comment';
}

const DATABASE_TYPES = ['PostgreSQL', 'MySQL', 'MariaDB', 'SQLite', 'SQL Server'];

function nextIdent(tokens: Token[], index: number): string | null {
  const name = tokens.slice(index + 1).find((item) => item.kind !== 'space');
  return name?.kind === 'ident' ? name.value : null;
}

function scanBlocks(doc: string, pos: number) {
  let table: string | null = null;
  let block: 'table' | 'enum' | 'group' | 'project' | null = null;
  let inSettings = false;
  let inIndexes = false;
  let brace = 0;
  const tokens = tokenizeDbml(doc.slice(0, pos));

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const word = token.kind === 'keyword' ? token.value.toLowerCase() : '';
    if (word === 'table' || word === 'enum' || word === 'tablegroup' || word === 'project') {
      const name = nextIdent(tokens, i);
      block = word === 'tablegroup' ? 'group' : (word as 'table' | 'enum' | 'project');
      table = word === 'table' ? name : null;
      inIndexes = false;
    }
    if (word === 'indexes') inIndexes = true;
    if (token.value === '{') brace += 1;
    if (token.value === '}') {
      brace = Math.max(0, brace - 1);
      if (brace === 0) {
        table = null;
        block = null;
        inIndexes = false;
      } else if (inIndexes) {
        inIndexes = false;
      }
    }
    if (token.value === '[') inSettings = true;
    if (token.value === ']') inSettings = false;
  }

  return {
    table,
    block,
    inSettings,
    inIndexes,
    inTable: brace > 0 && block === 'table' && table !== null,
  };
}

function filterCompletions(
  items: Completion[],
  prefix: string,
): Completion[] {
  const needle = prefix.toLowerCase();
  const filtered = needle
    ? items.filter((item) => item.label.toLowerCase().startsWith(needle) || item.insert.toLowerCase().startsWith(needle))
    : items;
  return filtered.slice(0, 12);
}

export function completeDbml(
  doc: string,
  pos: number,
  ast: DatabaseAST,
): { from: number; options: Completion[] } {
  const tokens = tokenizeDbml(doc);
  if (inStringOrComment(tokens, pos)) return { from: pos, options: [] };

  const { prefix, from } = currentWord(doc, pos);
  const before = doc.slice(lineStart(doc, pos), pos);
  const ctx = scanBlocks(doc, pos);
  const tables = Object.values(ast.tables);
  const options: Completion[] = [];

  const tableCompletions: Completion[] = tables.map((table) => ({
    label: table.name,
    kind: 'table',
    detail: 'table',
    insert: table.name,
  }));

  if (/\.\s*[A-Za-z0-9_]*$/.test(doc.slice(Math.max(0, pos - 64), pos))) {
    const ident = doc.slice(0, pos).match(/([A-Za-z_][A-Za-z0-9_]*)\.\s*[A-Za-z0-9_]*$/);
    const table = ident ? ast.tables[ident[1]] : undefined;
    const columns = (table?.fields ?? []).map((field) => ({
      label: field.name,
      kind: 'column' as const,
      detail: field.type,
      insert: field.name,
    }));
    return { from, options: filterCompletions(columns, prefix) };
  }

  if (ctx.inSettings || /\[[^\]]*$/.test(before)) {
    const settings: Completion[] = DBML_SETTINGS.map((label) => ({
      label,
      kind: 'setting',
      detail: 'column setting',
      insert: label,
    }));
    return { from, options: filterCompletions(settings, prefix) };
  }

  if (/^\s*Ref\s*:?\s*/i.test(before) || /Ref\s*:\s*$/i.test(before)) {
    const refs: Completion[] = tableCompletions.map((item) => ({
      ...item,
      insert: `${item.label}.`,
      detail: 'reference table',
    }));
    return { from, options: filterCompletions(refs, prefix) };
  }

  if (ctx.inTable && !ctx.inIndexes) {
    const trimmed = before.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    const afterName = words.length === 1 && !DBML_KEYWORDS.some((word) => word.toLowerCase() === words[0].toLowerCase());
    if (afterName || words.length === 0 || (words.length === 2 && prefix === words[1])) {
      const types: Completion[] = [
        ...Object.values(ast.enums ?? {}).map((item) => ({
          label: item.name,
          kind: 'type' as const,
          detail: 'enum',
          insert: item.name,
        })),
        ...DBML_TYPES.map((label) => ({
          label,
          kind: 'type' as const,
          detail: 'SQL type',
          insert: label,
        })),
      ];
      if (words.length <= 1 && !afterName) {
        types.unshift({
          label: 'indexes',
          kind: 'keyword',
          detail: 'index block',
          insert: 'indexes {\n    ()\n  }',
        });
      }
      return { from, options: filterCompletions(types, prefix) };
    }
  }

  if (ctx.block === 'group') {
    return { from, options: filterCompletions(tableCompletions, prefix) };
  }

  if (ctx.block === 'project' && /database_type\s*:\s*['"]?[A-Za-z ]*$/i.test(before)) {
    const engines: Completion[] = DATABASE_TYPES.map((label) => ({
      label,
      kind: 'keyword',
      detail: 'database type',
      insert: `'${label}'`,
    }));
    return { from, options: filterCompletions(engines, prefix) };
  }

  if (ctx.inIndexes) {
    const table = ctx.table ? ast.tables[ctx.table] : undefined;
    const columns: Completion[] = (table?.fields ?? []).map((field) => ({
      label: field.name,
      kind: 'column',
      detail: 'index column',
      insert: field.name,
    }));
    columns.push({
      label: 'unique',
      kind: 'setting',
      detail: 'index setting',
      insert: 'unique',
    });
    return { from, options: filterCompletions(columns, prefix) };
  }

  if (!ctx.inTable) {
    options.push(
      {
        label: 'Table',
        kind: 'snippet',
        detail: 'create table',
        insert: 'Table name {\n  id integer [pk, increment]\n  \n}',
      },
      {
        label: 'Ref',
        kind: 'snippet',
        detail: 'create relationship',
        insert: 'Ref: table.column > table.column',
      },
      {
        label: 'Enum',
        kind: 'snippet',
        detail: 'create enum',
        insert: 'Enum name {\n  \n}',
      },
      {
        label: 'TableGroup',
        kind: 'snippet',
        detail: 'group tables',
        insert: 'TableGroup name {\n  \n}',
      },
      {
        label: 'Project',
        kind: 'keyword',
        detail: 'project header',
        insert: "Project name {\n  database_type: 'PostgreSQL'\n}",
      },
    );
    options.push(...tableCompletions);
  }

  return { from, options: filterCompletions(options, prefix) };
}

function findNamedBlock(doc: string, keyword: string, name: string): { from: number; to: number } | null {
  const match = doc.match(new RegExp(`\\b${keyword}\\s+["']?${escapeReg(name)}["']?\\b`));
  if (!match || match.index == null) return null;
  const from = match.index + match[0].lastIndexOf(name);
  return { from, to: from + name.length };
}

function findLooseIdent(doc: string, name: string): { from: number; to: number } | null {
  const match = doc.match(new RegExp(`\\b${escapeReg(name)}\\b`));
  if (!match || match.index == null) return null;
  return { from: match.index, to: match.index + name.length };
}

function findIdentSpan(
  doc: string,
  ident: string,
  kind: 'table' | 'column',
  tableName?: string,
): { from: number; to: number } | null {
  if (kind === 'table') {
    const match = doc.match(new RegExp(`\\bTable\\s+["']?${escapeReg(ident)}["']?\\b`));
    if (!match || match.index == null) return null;
    const from = match.index + match[0].lastIndexOf(ident);
    return { from, to: from + ident.length };
  }

  const tableMatch = tableName
    ? doc.match(new RegExp(`\\bTable\\s+["']?${escapeReg(tableName)}["']?\\s*\\{`))
    : null;
  const searchFrom = tableMatch?.index ?? 0;
  const blockEnd = doc.indexOf('\n}', searchFrom);
  const slice = doc.slice(searchFrom, blockEnd === -1 ? doc.length : blockEnd);
  const col = slice.match(new RegExp(`(?:^|\\n)\\s*["']?${escapeReg(ident)}["']?\\b`));
  if (!col || col.index == null) return null;
  const local = col[0].lastIndexOf(ident);
  const from = searchFrom + col.index + local;
  return { from, to: from + ident.length };
}

function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseErrorLine(message: string | null | undefined): number | null {
  if (!message) return null;
  const match = message.match(/line\s+(\d+)/i) || message.match(/:(\d+):(\d+)/);
  return match ? Number(match[1]) : null;
}

export function lintDbml(
  doc: string,
  parseError: string | null,
  issues: ValidationIssue[],
  errorLine?: number | null,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  let brace = 0;
  let bracket = 0;
  let firstUnmatchedBrace = -1;
  let firstUnmatchedBracket = -1;

  for (let i = 0; i < doc.length; i += 1) {
    const ch = doc[i];
    if (ch === '{') {
      if (brace === 0) firstUnmatchedBrace = i;
      brace += 1;
    } else if (ch === '}') {
      brace -= 1;
      if (brace < 0) {
        diagnostics.push({
          from: i,
          to: i + 1,
          line: offsetToLine(doc, i),
          severity: 'error',
          message: 'Unexpected closing brace.',
          source: 'syntax',
        });
        brace = 0;
      }
    } else if (ch === '[') {
      if (bracket === 0) firstUnmatchedBracket = i;
      bracket += 1;
    } else if (ch === ']') {
      bracket -= 1;
      if (bracket < 0) {
        diagnostics.push({
          from: i,
          to: i + 1,
          line: offsetToLine(doc, i),
          severity: 'error',
          message: 'Unexpected closing bracket.',
          source: 'syntax',
        });
        bracket = 0;
      }
    }
  }

  if (brace > 0 && firstUnmatchedBrace >= 0) {
    diagnostics.push({
      from: firstUnmatchedBrace,
      to: firstUnmatchedBrace + 1,
      line: offsetToLine(doc, firstUnmatchedBrace),
      severity: 'error',
      message: "Missing closing brace '}'.",
      source: 'syntax',
    });
  }
  if (bracket > 0 && firstUnmatchedBracket >= 0) {
    diagnostics.push({
      from: firstUnmatchedBracket,
      to: firstUnmatchedBracket + 1,
      line: offsetToLine(doc, firstUnmatchedBracket),
      severity: 'error',
      message: "Missing closing bracket ']'.",
      source: 'syntax',
    });
  }

  if (parseError) {
    const line = errorLine ?? parseErrorLine(parseError);
    if (line) {
      const bounds = lineBounds(doc, line);
      diagnostics.push({
        from: bounds.from,
        to: Math.max(bounds.from + 1, bounds.to),
        line,
        severity: 'error',
        message: parseError,
        source: 'parse',
      });
    } else if (!diagnostics.some((item) => item.source === 'syntax')) {
      diagnostics.push({
        from: 0,
        to: Math.min(doc.length, 1),
        line: 1,
        severity: 'error',
        message: parseError,
        source: 'parse',
      });
    }
  }

  for (const issue of issues) {
    if (issue.id === 'empty-schema') continue;
    const enumName = issue.message.match(/^Enum "([^"]+)"/)?.[1];
    const missingTable = issue.message.match(/unknown table "([^"]+)"/)?.[1];
    const span = enumName
      ? findNamedBlock(doc, 'Enum', enumName)
      : missingTable
        ? findLooseIdent(doc, missingTable)
        : issue.fieldName && issue.tableName
          ? findIdentSpan(doc, issue.fieldName, 'column', issue.tableName)
          : issue.tableName
            ? findIdentSpan(doc, issue.tableName, 'table')
            : null;
    const from = span?.from ?? 0;
    const to = span?.to ?? Math.min(doc.length, 1);
    diagnostics.push({
      from,
      to: Math.max(from + 1, to),
      line: offsetToLine(doc, from),
      severity: issue.severity,
      message: issue.fix ? `${issue.message} ${issue.fix}` : issue.message,
      source: 'schema',
    });
  }

  return diagnostics.sort((left, right) => left.from - right.from);
}

export function tokenClass(kind: TokenKind): string {
  switch (kind) {
    case 'keyword':
      return 'dbml-hl-keyword';
    case 'type':
      return 'dbml-hl-type';
    case 'string':
      return 'dbml-hl-string';
    case 'comment':
      return 'dbml-hl-comment';
    case 'setting':
      return 'dbml-hl-setting';
    case 'number':
      return 'dbml-hl-number';
    case 'ident':
      return 'dbml-hl-ident';
    default:
      return 'dbml-hl-punct';
  }
}
