export const PROTECTED_TABLES = new Set([
  'User',
  'Post',
  '_prisma_migrations',
]);

export function isProtectedTable(name: string): boolean {
  return (
    name.startsWith('sqlite_') ||
    name.startsWith('_prisma') ||
    PROTECTED_TABLES.has(name)
  );
}

export function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isAllowedBuildStatement(sql: string): boolean {
  const stripped = stripSqlComments(sql);
  if (!stripped) return false;
  const withoutTrailing = stripped.replace(/;+$/, '');
  if (withoutTrailing.includes(';')) return false;
  return /^(CREATE\s+TABLE|CREATE\s+(UNIQUE\s+)?INDEX|PRAGMA\s+foreign_keys\s*=)/i.test(
    withoutTrailing,
  );
}

export function statementTouchesProtectedTable(sql: string): boolean {
  const stripped = stripSqlComments(sql);
  return [...PROTECTED_TABLES].some((name) =>
    new RegExp(`\\b${name}\\b`, 'i').test(stripped),
  );
}
