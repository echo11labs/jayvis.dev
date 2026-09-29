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
    expect(isAllowedBuildStatement('DROP TABLE "users";')).toBe(true);
    expect(isAllowedBuildStatement('ALTER TABLE "users" ADD COLUMN "email" TEXT;')).toBe(true);
    expect(isAllowedBuildStatement("ALTER TABLE \"users\" ADD COLUMN \"note\" TEXT DEFAULT '1); DROP TABLE users';")).toBe(true);
    expect(
      isAllowedBuildStatement('CREATE TABLE a (id INTEGER); DROP TABLE User;'),
    ).toBe(false);
  });

  it('protects migration bookkeeping and allows user tables', () => {
    expect(isProtectedTable('User')).toBe(false);
    expect(isProtectedTable('_prisma_migrations')).toBe(true);
    expect(isProtectedTable('users')).toBe(false);
    expect(statementTouchesProtectedTable('CREATE TABLE User (id TEXT)')).toBe(
      false,
    );
    expect(
      statementTouchesProtectedTable('CREATE TABLE _prisma_migrations (id TEXT)'),
    ).toBe(true);
  });
});
