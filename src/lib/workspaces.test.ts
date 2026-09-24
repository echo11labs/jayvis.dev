import { describe, expect, it } from 'vitest';
import {
  activeBranch,
  activeWorkspace,
  addBranch,
  addWorkspace,
  createCatalog,
  selectBranch,
  selectWorkspace,
  withActiveText,
} from './workspaces';

describe('workspace catalog', () => {
  it('keeps each branch’s schema when switching', () => {
    const catalog = withActiveText(createCatalog('ecommerce-db', 'Table users {}'), 'Table users {\n  id integer\n}');
    const forked = addBranch(catalog, 'checkout', 'Table orders {}');
    expect(forked.error).toBeUndefined();
    const back = selectBranch(forked.catalog, 'main');
    expect(activeBranch(activeWorkspace(back)).rawText).toContain('Table users');
    expect(activeWorkspace(forked.catalog).branch).toBe('checkout');
  });

  it('switches workspaces without dropping the one you left', () => {
    const first = withActiveText(createCatalog('ecommerce-db', 'Table users {}'), 'Table users {}');
    const next = addWorkspace(first, 'Table posts {}');
    const returned = selectWorkspace(next, first.activeId);
    expect(activeWorkspace(returned).name).toBe('ecommerce-db');
    expect(activeBranch(activeWorkspace(returned)).rawText).toBe('Table users {}');
    expect(next.workspaces).toHaveLength(2);
  });

  it('rejects a duplicate branch name', () => {
    const catalog = createCatalog('ecommerce-db', 'Table users {}');
    const result = addBranch(catalog, 'main', 'Table other {}');
    expect(result.error).toMatch(/already exists/);
    expect(result.catalog).toBe(catalog);
  });
});