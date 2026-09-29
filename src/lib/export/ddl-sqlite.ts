import type { DatabaseAST } from '@/types/ast';
import { buildSchemaScript, type BuiltStatement } from '@/lib/sql-script';

export interface SqlStatement extends BuiltStatement {}

export function buildSqlStatements(ast: DatabaseAST): SqlStatement[] {
  return buildSchemaScript(ast, 'sqlite').statements;
}

export function buildSqlScript(ast: DatabaseAST): string {
  return buildSchemaScript(ast, 'sqlite').script;
}

export function sqliteTypeNotes(ast: DatabaseAST): string[] {
  return buildSchemaScript(ast, 'sqlite').notes;
}
