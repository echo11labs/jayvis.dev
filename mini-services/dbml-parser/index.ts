/**
 * StitchDB DBML Parser — mini-service
 * ----------------------------------
 * An isolated Bun HTTP server that owns the heavy @dbml/core pegjs parser
 * (21 MB). Keeping it out of the Next.js process avoids Turbopack OOM
 * during compilation.
 *
 * Endpoint:  POST /parse
 *   Body:    { "dbml": "<DBML text>" }
 *   Returns: { ast, nodes, edges, error }
 *
 * Runs on port 3031. The frontend reaches it through the gateway via
 * the relative path:  fetch('/parse?XTransformPort=3031')
 */
import { Parser } from '@dbml/core';

const PORT = 3031;

interface FieldConstraint {
  isPrimaryKey?: boolean;
  isUnique?: boolean;
  isNullable?: boolean;
  defaultValue?: string;
  isAutoincrement?: boolean;
}

function normalizeType(typeObj: any): string {
  if (!typeObj) return 'text';
  const name = typeObj.type_name || 'text';
  if (typeObj.args && Array.isArray(typeObj.args) && typeObj.args.length > 0) {
    const args = typeObj.args
      .map((a: any) => (typeof a === 'object' ? a?.value ?? a : String(a)))
      .join(', ');
    return `${name}(${args})`;
  }
  return name;
}

function normalizeDefault(dbdefault: any): string | undefined {
  if (!dbdefault) return undefined;
  const v = dbdefault.value;
  if (dbdefault.type === 'string') return `'${v}'`;
  if (dbdefault.type === 'boolean') return String(v);
  if (dbdefault.type === 'expression') return String(v);
  return String(v ?? '');
}

function deriveCardinality(endpoints: any[]): string {
  if (!endpoints || endpoints.length < 2) return '1:N';
  const [a, b] = endpoints;
  const aMany = a?.relation === '*';
  const bMany = b?.relation === '*';
  if (aMany && bMany) return 'N:M';
  if (!aMany && !bMany) return '1:1';
  return '1:N';
}

function refId(r: any, idx: number): string {
  const e = r.endpoints || [];
  if (e.length >= 2) {
    return `ref_${e[0].tableName}.${(e[0].fieldNames || [])[0]}__${e[1].tableName}.${(e[1].fieldNames || [])[0]}`;
  }
  return `ref_${idx}`;
}

const TABLE_COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6',
  '#06B6D4', '#EF4444', '#84CC16', '#14B8A6', '#F97316',
];

function parseDbml(dbml: string) {
  if (!dbml || !dbml.trim()) {
    return {
      ast: { version: '1.0', tables: {}, references: {} },
      nodes: [],
      edges: [],
      error: null,
    };
  }

  try {
    const db = Parser.parse(dbml, 'dbmlv2');
    const exported = (db as any).export() as any;

    const tables: Record<string, any> = {};
    const references: Record<string, any> = {};
    const nodes: any[] = [];
    const edges: any[] = [];

    let colorIndex = 0;
    for (const schema of exported.schemas || []) {
      const schemaName = schema.name || 'public';

      for (const t of schema.tables || []) {
        const tableName = t.name;
        const color =
          t.headerColor || TABLE_COLORS[colorIndex % TABLE_COLORS.length];
        colorIndex++;

        const fields = (t.fields || []).map((f: any) => {
          const constraints: FieldConstraint = {
            isPrimaryKey: !!f.pk,
            isUnique: !!f.unique,
            isNullable: f.not_null === undefined ? true : !f.not_null,
            defaultValue: normalizeDefault(f.dbdefault),
            isAutoincrement: !!f.increment,
          };
          return {
            id: `${tableName}.${f.name}`,
            name: f.name,
            type: normalizeType(f.type),
            constraints,
            note: f.note || undefined,
          };
        });

        const indexes = (t.indexes || []).map((idx: any) => ({
          name: idx.name || undefined,
          columns: (idx.columns || [])
            .map((c: any) => c?.value ?? c?.name ?? String(c))
            .filter(Boolean),
          isUnique: !!idx.unique,
        }));

        const table = {
          id: tableName,
          name: tableName,
          schema: schemaName,
          color,
          fields,
          indexes,
          position: { x: 0, y: 0 },
        };
        tables[tableName] = table;
        nodes.push({
          id: tableName,
          type: 'table',
          position: { x: 0, y: 0 },
          data: { table },
        });
      }

      for (let i = 0; i < (schema.refs || []).length; i++) {
        const r = schema.refs[i];
        const e = r.endpoints || [];
        if (e.length < 2) continue;

        const source = e[0];
        const target = e[1];
        const sourceField = (source.fieldNames || [])[0] || 'id';
        const targetField = (target.fieldNames || [])[0] || 'id';
        const id = refId(r, i);

        references[id] = {
          id,
          sourceTable: source.tableName,
          sourceField,
          targetTable: target.tableName,
          targetField,
          cardinality: deriveCardinality(e),
          onDelete: r.onDelete,
          onUpdate: r.onUpdate,
        };

        edges.push({
          id,
          source: source.tableName,
          target: target.tableName,
          sourceHandle: `${source.tableName}.${sourceField}-source`,
          targetHandle: `${target.tableName}.${targetField}-target`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#6366F1', strokeWidth: 2 },
          label: deriveCardinality(e),
          labelStyle: { fontSize: 10, fill: '#a1a1aa' },
          labelBgStyle: { fill: '#18181b' },
        });
      }
    }

    return {
      ast: { version: '1.0', tables, references },
      nodes,
      edges,
      error: null,
    };
  } catch (err: any) {
    const msg =
      err?.diags?.[0]?.message || err?.message || 'Failed to parse DBML';
    return {
      ast: { version: '1.0', tables: {}, references: {} },
      nodes: [],
      edges: [],
      error: msg,
    };
  }
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS / preflight for direct browser access.
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: 'stitchdb-dbml-parser' });
    }

    if (url.pathname === '/parse' && req.method === 'POST') {
      try {
        const body = await req.json();
        const result = parseDbml(body?.dbml ?? '');
        return Response.json(result, {
          headers: { 'Access-Control-Allow-Origin': '*' },
        });
      } catch (err: any) {
        return Response.json(
          { error: err?.message || 'Bad request' },
          { status: 400 },
        );
      }
    }

    return new Response('Not found', { status: 404 });
  },
});

console.log(`StitchDB DBML parser service listening on http://localhost:${PORT}`);
export default server;
