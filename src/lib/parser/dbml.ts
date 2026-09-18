/**
 * DBML serialization (client-safe).
 *
 * The actual parsing of DBML text → DatabaseAST happens server-side in
 * `/api/parse` so the heavy @dbml/core pegjs parser (21 MB) never enters
 * the client bundle. This file only contains the pure-TS inverse:
 * DatabaseAST → DBML text, used when exporting or syncing the canvas
 * back into the editor.
 */
import { DatabaseAST } from '@/types/ast';

export function serializeDBML(ast: DatabaseAST): string {
  const lines: string[] = [];

  for (const table of Object.values(ast.tables)) {
    lines.push(`Table ${table.name} {`);
    for (const f of table.fields) {
      const settings: string[] = [];
      if (f.constraints.isPrimaryKey) settings.push('pk');
      if (f.constraints.isUnique && !f.constraints.isPrimaryKey)
        settings.push('unique');
      if (f.constraints.isNullable === false) settings.push('not null');
      if (f.constraints.isAutoincrement) settings.push('increment');
      if (f.constraints.defaultValue)
        settings.push(`default: ${f.constraints.defaultValue}`);
      const settingStr = settings.length > 0 ? ` [${settings.join(', ')}]` : '';
      lines.push(`  ${f.name} ${f.type}${settingStr}`);
    }
    if (table.indexes && table.indexes.length > 0) {
      for (const idx of table.indexes) {
        const cols = idx.columns.join(', ');
        const settings = idx.isUnique ? ' [unique]' : '';
        lines.push(`  indexes { (${cols})${settings} }`);
      }
    }
    lines.push('}');
    lines.push('');
  }

  for (const ref of Object.values(ast.references)) {
    const del = ref.onDelete ? ` [delete: ${ref.onDelete.toLowerCase()}]` : '';
    lines.push(
      `Ref: ${ref.sourceTable}.${ref.sourceField} > ${ref.targetTable}.${ref.targetField}${del}`,
    );
  }

  return lines.join('\n');
}
