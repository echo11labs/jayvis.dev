/**
 * JayVis.dev DBML Parser — mini-service
 * ----------------------------------
 * An isolated Node HTTP server that owns the heavy @dbml/core pegjs parser
 * (21 MB). Keeping it out of the Next.js process avoids Turbopack OOM
 * during compilation.
 *
 * Endpoint:  POST /parse
 *   Body:    { "dbml": "<DBML text>" }
 *   Returns: { ast, nodes, edges, error }
 *
 * Runs on port 3031 by default. Next.js reaches it through `/api/parse`.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import { Parser } from '@dbml/core';

const PORT = Number(process.env.DBML_PARSER_PORT ?? 3031);
const HOST = process.env.DBML_PARSER_HOST ?? '127.0.0.1';
const MAX_BODY_BYTES = 1_000_000;

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

function cardinalityStroke(cardinality: string): string {
  switch (cardinality) {
    case '1:1':
      return '#10B981';
    case '1:N':
      return '#6366F1';
    case 'N:M':
      return '#EC4899';
    default:
      return '#6366F1';
  }
}

function edgeLabel(_sourceField: string, _targetField: string, cardinality: string): string {
  if (cardinality === '1:1') return '1:1';
  if (cardinality === 'N:M') return '*:*';
  return '1:*';
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

export function parseDbml(dbml: string) {
  if (!dbml || !dbml.trim()) {
    return {
      ast: { version: '1.0', tables: {}, references: {}, enums: {}, tableGroups: {} },
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
    const enums: Record<string, any> = {};
    const tableGroups: Record<string, any> = {};
    const nodes: any[] = [];
    const edges: any[] = [];
    for (const schema of exported.schemas || []) {
      const schemaName = schema.name || 'public';

      for (const t of schema.tables || []) {
        const tableName = t.name;

        // Simple string hash for deterministic color
        let hash = 0;
        for (let i = 0; i < tableName.length; i++) {
          hash = tableName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const color = t.headerColor || TABLE_COLORS[Math.abs(hash) % TABLE_COLORS.length];

        const fields = (t.fields || []).map((f: any) => {
          const constraints: FieldConstraint = {
            isPrimaryKey: !!f.pk,
            isUnique: !!f.unique,
            isNullable: f.pk || f.increment ? false : f.not_null === undefined ? true : !f.not_null,
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

        const cardinality = deriveCardinality(e);
        const stroke = cardinalityStroke(cardinality);

        references[id] = {
          id,
          sourceTable: source.tableName,
          sourceField,
          targetTable: target.tableName,
          targetField,
          cardinality,
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
          style: { stroke, strokeWidth: 2 },
          label: edgeLabel(sourceField, targetField, cardinality),
          labelStyle: { fontSize: 10, fill: '#a1a1aa' },
          labelBgStyle: { fill: '#18181b' },
          markerEnd: {
            type: 'arrowclosed',
            width: 16,
            height: 16,
            color: stroke,
          },
        });
      }

      for (const item of schema.enums || []) {
        const name = item.name;
        if (!name) continue;
        enums[name] = {
          name,
          note: item.note || undefined,
          values: (item.values || []).map((value: any) => ({
            name: value.name,
            note: value.note || undefined,
          })),
        };
      }

      for (const group of schema.tableGroups || []) {
        const name = group.name;
        if (!name) continue;
        tableGroups[name] = {
          name,
          note: group.note || undefined,
          tables: (group.tables || [])
            .map((table: any) => table.tableName ?? table.name)
            .filter(Boolean),
        };
      }
    }

    return {
      ast: { version: '1.0', tables, references, enums, tableGroups },
      nodes,
      edges,
      error: null,
    };
  } catch (err: any) {
    const diag = err?.diags?.[0];
    const loc = diag?.location?.start;
    const msg = diag?.message || err?.message || 'Failed to parse DBML';
    return {
      ast: { version: '1.0', tables: {}, references: {}, enums: {}, tableGroups: {} },
      nodes: [],
      edges: [],
      error: msg,
      errorLine: typeof loc?.line === 'number' ? loc.line : null,
      errorColumn: typeof loc?.column === 'number' ? loc.column : null,
    };
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function sendJson(
  response: ServerResponse,
  status: number,
  payload: unknown,
) {
  response.writeHead(status, {
    ...CORS_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
      throw new Error('Payload too large');
    }
  }

  return JSON.parse(body);
}

export function createParserServer() {
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', `http://${HOST}:${PORT}`);

    if (request.method === 'OPTIONS') {
      response.writeHead(204, CORS_HEADERS);
      response.end();
      return;
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      sendJson(response, 200, {
        ok: true,
        service: 'jayvis-dbml-parser',
      });
      return;
    }

    if (url.pathname === '/parse' && request.method === 'POST') {
      try {
        const body = await readJsonBody(request) as { dbml?: unknown };
        if (typeof body.dbml !== 'string') {
          sendJson(response, 400, {
            error: 'Missing or invalid "dbml" field',
          });
          return;
        }

        sendJson(response, 200, parseDbml(body.dbml));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Invalid JSON payload';
        sendJson(response, message === 'Payload too large' ? 413 : 400, {
          error:
            message === 'Unexpected end of JSON input'
              ? 'Invalid JSON payload'
              : message,
        });
      }
      return;
    }

    sendJson(response, 404, { error: 'Not found' });
  });
}

const entryUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : null;

if (entryUrl === import.meta.url) {
  const server = createParserServer();
  server.listen(PORT, HOST, () => {
    console.log(
      `JayVis.dev DBML parser service listening on http://${HOST}:${PORT}`,
    );
  });

  const shutdown = (signal: NodeJS.Signals) => {
    console.log(`Received ${signal}; stopping DBML parser service`);
    server.close((error) => {
      process.exit(error ? 1 : 0);
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
