export function normalizeIdent(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

export function hasDuplicateIdents(names: string[]): boolean {
  const normalized = names.map(normalizeIdent).filter(Boolean);
  return new Set(normalized).size !== normalized.length;
}

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}
