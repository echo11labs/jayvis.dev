import type { DatabaseAST } from '@/types/ast';
import { serializeDBML } from '@/lib/parser/dbml';
import { exportDDL } from '@/lib/export/ddl';
import { buildSqlScript } from '@/lib/export/ddl-sqlite';
import { exportPrisma } from '@/lib/export/prisma';
import { exportErdSvg } from '@/lib/export/erd-svg';
import { downloadText } from '@/lib/export/download';

export type ExportFormat = 'dbml' | 'json' | 'sql' | 'sqlite' | 'svg' | 'prisma';

export interface ExportFile {
  filename: string;
  content: string;
  mime: string;
}

export function nodePositions(
  nodes: Array<{ id: string; position: { x: number; y: number } }>,
): Record<string, { x: number; y: number }> {
  return Object.fromEntries(nodes.map((node) => [node.id, node.position]));
}

export function exportBaseName(name?: string) {
  const cleaned = (name || 'schema')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'schema';
}

export function buildExportFile(
  format: ExportFormat,
  ast: DatabaseAST,
  positions: Record<string, { x: number; y: number }> = {},
  name?: string,
): ExportFile {
  const base = exportBaseName(name);
  switch (format) {
    case 'dbml':
      return {
        filename: `${base}.dbml`,
        content: serializeDBML(ast),
        mime: 'text/plain',
      };
    case 'json':
      return {
        filename: `${base}.json`,
        content: JSON.stringify(ast, null, 2),
        mime: 'application/json',
      };
    case 'sql':
      return {
        filename: `${base}.sql`,
        content: exportDDL(ast),
        mime: 'text/sql',
      };
    case 'sqlite':
      return {
        filename: `${base}.sqlite.sql`,
        content: buildSqlScript(ast),
        mime: 'text/sql',
      };
    case 'svg':
      return {
        filename: `${base}.svg`,
        content: exportErdSvg(ast, positions),
        mime: 'image/svg+xml',
      };
    case 'prisma':
      return {
        filename: `${base}.prisma`,
        content: exportPrisma(ast),
        mime: 'text/plain',
      };
  }
}

export function exportWorkspace(
  format: ExportFormat,
  ast: DatabaseAST,
  positions: Record<string, { x: number; y: number }> = {},
  name?: string,
): string {
  const file = buildExportFile(format, ast, positions, name);
  downloadText(file.filename, file.content, file.mime);
  return `Exported ${file.filename}`;
}
