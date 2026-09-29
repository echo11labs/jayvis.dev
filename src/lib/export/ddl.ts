/**
 * PostgreSQL DDL exporter — converts a DatabaseAST into a complete
 * `CREATE TABLE` + `ALTER TABLE ... ADD CONSTRAINT` SQL script.
 */
import type { DatabaseAST } from '@/types/ast';
import { buildSchemaScript } from '@/lib/sql-script';

export function exportDDL(ast: DatabaseAST): string {
  if (Object.keys(ast.tables).length === 0) {
    return '-- JayVis.dev schema export (PostgreSQL DDL)\n-- empty schema\n';
  }
  return buildSchemaScript(ast, 'postgres').script;
}
