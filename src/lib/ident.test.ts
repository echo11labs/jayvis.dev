import { describe, expect, it } from 'vitest';
import { hasDuplicateIdents, normalizeIdent, quoteIdent } from './ident';

describe('idents', () => {
  it('normalizes names for tables and columns', () => {
    expect(normalizeIdent('  Order Items ')).toBe('order_items');
  });

  it('detects duplicate names after normalization', () => {
    expect(hasDuplicateIdents(['id', 'ID', 'email'])).toBe(true);
    expect(hasDuplicateIdents(['id', 'email'])).toBe(false);
  });

  it('quotes identifiers for SQL', () => {
    expect(quoteIdent('users')).toBe('"users"');
    expect(quoteIdent('weird"name')).toBe('"weird""name"');
  });
});
