import { describe, expect, it } from 'vitest';
import {
  isAllowedBuildStatement,
  isProtectedTable,
  statementTouchesProtectedTable,
} from './sql-guard';

describe('SQL builder guards', () => {
  it('allows CREATE TABLE and rejects multi-statement or drop payloads', () => {
    expect(
      isAllowedBuildStatement('CREATE TABLE users (id INTEGER PRIMARY KEY);'),
    ).toBe(true);
    expect(isAllowedBuildStatement('DROP TABLE users;')).toBe(false);
    expect(
      isAllowedBuildStatement('CREATE TABLE a (id INTEGER); DROP TABLE User;'),
    ).toBe(false);
  });

  it('protects Prisma-managed tables', () => {
    expect(isProtectedTable('User')).toBe(true);
    expect(isProtectedTable('_prisma_migrations')).toBe(true);
    expect(isProtectedTable('users')).toBe(false);
    expect(statementTouchesProtectedTable('CREATE TABLE User (id TEXT)')).toBe(
      true,
    );
  });
});
