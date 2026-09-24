/**
 * DBML serialization (client-safe).
 *
 * The actual parsing of DBML text → DatabaseAST happens server-side in
 * `/api/parse` so the heavy @dbml/core pegjs parser (21 MB) never enters
 * the client bundle. This file only contains the pure-TS inverse:
 * DatabaseAST → DBML text, used when exporting or syncing the canvas
 * back into the editor.
 */
import { quoteIdent } from '@/lib/ident';
import { DatabaseAST } from '@/types/ast';

function dbmlIdent(name: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : quoteIdent(name);
}

/** Normalize persisted or pasted DBML so HTML line breaks never leak into the editor. */
export function sanitizeDbmlText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/&amp;lt;/gi, '<')
    .replace(/&amp;gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#0*10;/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:div|p)>/gi, '\n')
    .replace(/<(?:div|p)[^>]*>/gi, '');
}

export function serializeDBML(ast: DatabaseAST): string {
  const lines: string[] = [];

  for (const table of Object.values(ast.tables)) {
    if (table.note) {
      lines.push(`Table ${dbmlIdent(table.name)} {`);
      lines.push(`  note: '${table.note.replace(/'/g, "\\'")}'`);
    } else {
      lines.push(`Table ${dbmlIdent(table.name)} {`);
    }
    for (const f of table.fields) {
      const settings: string[] = [];
      if (f.constraints.isPrimaryKey) settings.push('pk');
      if (f.constraints.isUnique && !f.constraints.isPrimaryKey)
        settings.push('unique');
      if (f.constraints.isNullable === false) settings.push('not null');
      if (f.constraints.isAutoincrement) settings.push('increment');
      if (f.constraints.defaultValue)
        settings.push(`default: ${f.constraints.defaultValue}`);
      if (f.note) settings.push(`note: '${f.note.replace(/'/g, "\\'")}'`);
      const settingStr = settings.length > 0 ? ` [${settings.join(', ')}]` : '';
      lines.push(`  ${dbmlIdent(f.name)} ${f.type}${settingStr}`);
    }
    if (table.indexes && table.indexes.length > 0) {
      lines.push('  indexes {');
      for (const idx of table.indexes) {
        const cols = idx.columns.join(', ');
        const settings = idx.isUnique ? ' [unique]' : '';
        const namePart = idx.name ? `${idx.name} ` : '';
        lines.push(`    ${namePart}(${cols})${settings}`);
      }
      lines.push('  }');
    }
    lines.push('}');
    lines.push('');
  }

  for (const item of Object.values(ast.enums ?? {})) {
    lines.push(`Enum ${dbmlIdent(item.name)} {`);
    for (const value of item.values) {
      const note = value.note ? ` [note: '${value.note.replace(/'/g, "\\'")}']` : '';
      lines.push(`  ${dbmlIdent(value.name)}${note}`);
    }
    lines.push('}');
    lines.push('');
  }

  for (const group of Object.values(ast.tableGroups ?? {})) {
    lines.push(`TableGroup ${dbmlIdent(group.name)} {`);
    for (const tableName of group.tables) {
      lines.push(`  ${dbmlIdent(tableName)}`);
    }
    lines.push('}');
    lines.push('');
  }

  for (const ref of Object.values(ast.references)) {
    const refSettings: string[] = [];
    if (ref.onDelete) refSettings.push(`delete: ${ref.onDelete.toLowerCase()}`);
    if (ref.onUpdate) refSettings.push(`update: ${ref.onUpdate.toLowerCase()}`);
    const settingStr =
      refSettings.length > 0 ? ` [${refSettings.join(', ')}]` : '';
    lines.push(
      `Ref: ${dbmlIdent(ref.sourceTable)}.${dbmlIdent(ref.sourceField)} > ${dbmlIdent(ref.targetTable)}.${dbmlIdent(ref.targetField)}${settingStr}`,
    );
  }

  return lines.join('\n');
}
