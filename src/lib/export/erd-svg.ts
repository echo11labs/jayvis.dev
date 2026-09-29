'use client';

import type { DatabaseAST, SchemaField } from '@/types/ast';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generates a standalone SVG document of the ERD from the AST + node
 * positions. Pure (no DOM rasterization), so it reliably produces a
 * clean, scalable image that opens in any browser or image tool.
 *
 * Each table is drawn as a rounded rectangle with a colored header and
 * a row per field; references are drawn as bezier curves.
 */
export function exportErdSvg(
  ast: DatabaseAST,
  positions: Record<string, { x: number; y: number }>,
): string {
  const tables = Object.values(ast.tables);
  if (tables.length === 0) return '<svg xmlns="http://www.w3.org/2000/svg"/>';

  const NODE_W = 270;
  const HEADER_H = 34;
  const ROW_H = 24;
  const PADDING = 60;

  // Compute bounding box.
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const tableBoxes: Record<string, { x: number; y: number; w: number; h: number }> = {};
  for (const t of tables) {
    const pos = positions[t.name] ?? { x: 0, y: 0 };
    const h = HEADER_H + t.fields.length * ROW_H + 8;
    tableBoxes[t.name] = { x: pos.x, y: pos.y, w: NODE_W, h };
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + NODE_W);
    maxY = Math.max(maxY, pos.y + h);
  }

  const width = maxX - minX + PADDING * 2;
  const height = maxY - minY + PADDING * 2;
  const offsetX = -minX + PADDING;
  const offsetY = -minY + PADDING;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background:#0a0a0a">`,
  );
  parts.push(`<rect width="${width}" height="${height}" fill="#0a0a0a"/>`);

  // Grid dots.
  for (let gx = 0; gx < width; gx += 22) {
    for (let gy = 0; gy < height; gy += 22) {
      parts.push(`<circle cx="${gx}" cy="${gy}" r="0.5" fill="#27272a"/>`);
    }
  }

  // Edges (references) — drawn first so they sit behind tables.
  for (const ref of Object.values(ast.references)) {
    const src = tableBoxes[ref.sourceTable];
    const tgt = tableBoxes[ref.targetTable];
    if (!src || !tgt) continue;
    // Source: right edge of source table, at the field row.
    const srcFieldIdx = ast.tables[ref.sourceTable].fields.findIndex(
      (f) => f.name === ref.sourceField,
    );
    const tgtFieldIdx = ast.tables[ref.targetTable].fields.findIndex(
      (f) => f.name === ref.targetField,
    );
    const sx = src.x + src.w + offsetX;
    const sy = src.y + HEADER_H + (srcFieldIdx >= 0 ? srcFieldIdx : 0) * ROW_H + ROW_H / 2 + offsetY;
    const tx = tgt.x + offsetX;
    const ty = tgt.y + HEADER_H + (tgtFieldIdx >= 0 ? tgtFieldIdx : 0) * ROW_H + ROW_H / 2 + offsetY;
    const midX = (sx + tx) / 2;
    parts.push(
      `<path d="M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}" stroke="#c45c26" stroke-width="2" fill="none" opacity="0.8"/>`,
    );
    parts.push(
      `<circle cx="${tx}" cy="${ty}" r="3" fill="#c45c26"/>`,
    );
    if (ref.cardinality) {
      parts.push(
        `<text x="${midX}" y="${(sy + ty) / 2 - 4}" fill="#a1a1aa" font-family="monospace" font-size="10" text-anchor="middle">${ref.cardinality}</text>`,
      );
    }
  }

  // Tables.
  for (const t of tables) {
    const box = tableBoxes[t.name];
    const x = box.x + offsetX;
    const y = box.y + offsetY;
    const color = t.color || '#c45c26';

    // Card shadow.
    parts.push(
      `<rect x="${x + 2}" y="${y + 4}" width="${box.w}" height="${box.h}" rx="10" fill="#000" opacity="0.5"/>`,
    );
    // Card body.
    parts.push(
      `<rect x="${x}" y="${y}" width="${box.w}" height="${box.h}" rx="10" fill="#09090b" stroke="#27272a" stroke-width="1"/>`,
    );
    // Header gradient background.
    parts.push(
      `<rect x="${x}" y="${y}" width="${box.w}" height="${HEADER_H}" rx="10" fill="${color}" opacity="0.15"/>`,
    );
    // Top accent bar.
    parts.push(
      `<rect x="${x}" y="${y}" width="${box.w}" height="3" rx="1.5" fill="${color}"/>`,
    );
    // Header text — schema + table name.
    parts.push(
      `<text x="${x + 10}" y="${y + 20}" fill="#a1a1aa" font-family="monospace" font-size="9" font-weight="bold">${escapeXml((t.schema || 'public').toUpperCase())}</text>`,
    );
    parts.push(
      `<text x="${x + 10}" y="${y + 32}" fill="#f4f4f5" font-family="sans-serif" font-size="13" font-weight="600">${escapeXml(t.name)}</text>`,
    );
    // Column count badge.
    parts.push(
      `<text x="${x + box.w - 10}" y="${y + 24}" fill="#71717a" font-family="monospace" font-size="10" text-anchor="end">${t.fields.length} col</text>`,
    );

    // Fields.
    t.fields.forEach((f: SchemaField, i: number) => {
      const ry = y + HEADER_H + i * ROW_H;
      // Alternating row bg.
      if (i % 2 === 1) {
        parts.push(
          `<rect x="${x}" y="${ry}" width="${box.w}" height="${ROW_H}" fill="#18181b" opacity="0.4"/>`,
        );
      }
      let textX = x + 10;
      if (f.constraints.isPrimaryKey) {
        parts.push(
          `<rect x="${textX - 2}" y="${ry + 6}" width="18" height="12" rx="2" fill="#f59e0b" opacity="0.2" stroke="#f59e0b" stroke-width="0.5"/>`,
        );
        parts.push(
          `<text x="${textX + 7}" y="${ry + 15}" fill="#f59e0b" font-family="monospace" font-size="8" font-weight="bold" text-anchor="middle">PK</text>`,
        );
        textX += 22;
      }
      if (f.constraints.isUnique && !f.constraints.isPrimaryKey) {
        parts.push(
          `<text x="${textX}" y="${ry + 15}" fill="#38bdf8" font-family="monospace" font-size="8" font-weight="bold">UQ</text>`,
        );
        textX += 18;
      }
      parts.push(
        `<text x="${textX}" y="${ry + 16}" fill="${f.constraints.isPrimaryKey ? '#f4f4f5' : '#d4d4d8'}" font-family="monospace" font-size="11" ${f.constraints.isPrimaryKey ? 'font-weight="600"' : ''}>${escapeXml(f.name)}</text>`,
      );
      // Type (right-aligned).
      parts.push(
        `<text x="${x + box.w - 10}" y="${ry + 16}" fill="#71717a" font-family="monospace" font-size="10" text-anchor="end">${escapeXml(f.type)}${f.constraints.isNullable === false ? ' *' : ''}</text>`,
      );
    });
  }

  parts.push('</svg>');
  return parts.join('\n');
}

/** Triggers a download of the ERD as an SVG file. */
export function downloadErdSvg(ast: DatabaseAST, positions: Record<string, { x: number; y: number }>) {
  const svg = exportErdSvg(ast, positions);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'schema.svg';
  a.click();
  URL.revokeObjectURL(url);
}
