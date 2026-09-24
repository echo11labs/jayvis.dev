/**
 * JayVis.dev MCP Agent Bridge
 * -------------------------
 * Exposes a Model Context Protocol (MCP) server that lets external IDE
 * agents (Cursor, Windsurf, Claude Code) inspect and mutate the live
 * JayVis.dev schema.
 *
 * The browser app persists its current DatabaseAST to a JSON file
 * (`jayvis-state.json`) whenever it changes. This MCP server reads
 * from and writes to that file, so agent edits flow back into the app
 * on the next poll cycle.
 *
 * Run standalone via: `bun run src/mcp/server.ts`
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  DatabaseAST,
  SchemaField,
  SchemaTable,
  TABLE_COLORS,
} from '@/types/ast';

const STATE_FILE = path.resolve(process.cwd(), 'jayvis-state.json');

function readState(): DatabaseAST {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(raw) as DatabaseAST;
    }
  } catch {
    /* ignore corrupt state */
  }
  return { version: '1.0', tables: {}, references: {} };
}

function writeState(ast: DatabaseAST): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(ast, null, 2));
}

export async function runMcpServer(): Promise<void> {
  const server = new Server(
    { name: 'jayvis-agent-bridge', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'get_current_schema',
        description:
          'Returns the active JayVis.dev database schema as a structured JSON AST (tables + references).',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_tables',
        description: 'Returns a concise list of all table names in the schema.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'describe_table',
        description: 'Returns the full column list and constraints for a table.',
        inputSchema: {
          type: 'object',
          properties: {
            tableName: { type: 'string' },
          },
          required: ['tableName'],
        },
      },
      {
        name: 'add_field_to_table',
        description: 'Adds a new column to an existing table in the schema.',
        inputSchema: {
          type: 'object',
          properties: {
            tableName: { type: 'string' },
            fieldName: { type: 'string' },
            fieldType: { type: 'string' },
            isNullable: { type: 'boolean' },
            isPrimaryKey: { type: 'boolean' },
            defaultValue: { type: 'string' },
          },
          required: ['tableName', 'fieldName', 'fieldType'],
        },
      },
      {
        name: 'add_table',
        description: 'Creates a new table with the given name and optional columns.',
        inputSchema: {
          type: 'object',
          properties: {
            tableName: { type: 'string' },
            fields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  isPrimaryKey: { type: 'boolean' },
                  isNullable: { type: 'boolean' },
                },
              },
            },
          },
          required: ['tableName'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'get_current_schema') {
      const ast = readState();
      return {
        content: [{ type: 'text', text: JSON.stringify(ast, null, 2) }],
      };
    }

    if (name === 'list_tables') {
      const ast = readState();
      const list = Object.values(ast.tables).map((t) => ({
        name: t.name,
        schema: t.schema,
        columnCount: t.fields.length,
      }));
      return {
        content: [{ type: 'text', text: JSON.stringify(list, null, 2) }],
      };
    }

    if (name === 'describe_table') {
      const { tableName } = args as { tableName: string };
      const ast = readState();
      const table = ast.tables[tableName];
      if (!table) {
        return {
          content: [{ type: 'text', text: `Table "${tableName}" not found.` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(table, null, 2) }],
      };
    }

    if (name === 'add_field_to_table') {
      const {
        tableName,
        fieldName,
        fieldType,
        isNullable,
        isPrimaryKey,
        defaultValue,
      } = args as {
        tableName: string;
        fieldName: string;
        fieldType: string;
        isNullable?: boolean;
        isPrimaryKey?: boolean;
        defaultValue?: string;
      };

      const ast = readState();
      if (!ast.tables[tableName]) {
        return {
          content: [
            { type: 'text', text: `Table "${tableName}" not found.` },
          ],
          isError: true,
        };
      }

      const field: SchemaField = {
        id: `${tableName}.${fieldName}`,
        name: fieldName,
        type: fieldType,
        constraints: {
          isNullable: isNullable ?? true,
          isPrimaryKey: isPrimaryKey ?? false,
          defaultValue,
        },
      };

      ast.tables[tableName].fields.push(field);
      writeState(ast);

      return {
        content: [
          {
            type: 'text',
            text: `Added column "${fieldName}" (${fieldType}) to table "${tableName}".`,
          },
        ],
      };
    }

    if (name === 'add_table') {
      const { tableName, fields } = args as {
        tableName: string;
        fields?: Array<{
          name: string;
          type: string;
          isPrimaryKey?: boolean;
          isNullable?: boolean;
        }>;
      };

      const ast = readState();
      if (ast.tables[tableName]) {
        return {
          content: [
            { type: 'text', text: `Table "${tableName}" already exists.` },
          ],
          isError: true,
        };
      }

      const colorIndex = Object.keys(ast.tables).length;
      const table: SchemaTable = {
        id: tableName,
        name: tableName,
        schema: 'public',
        color: TABLE_COLORS[colorIndex % TABLE_COLORS.length],
        fields:
          fields?.map((f) => ({
            id: `${tableName}.${f.name}`,
            name: f.name,
            type: f.type,
            constraints: {
              isPrimaryKey: f.isPrimaryKey ?? false,
              isNullable: f.isNullable ?? true,
            },
          })) ?? [],
      };

      ast.tables[tableName] = table;
      writeState(ast);

      return {
        content: [
          {
            type: 'text',
            text: `Created table "${tableName}" with ${table.fields.length} column(s).`,
          },
        ],
      };
    }

    throw new Error(`Tool not found: ${name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Auto-run when executed directly.
const isDirectRun =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.url ?? '');
if (isDirectRun) {
  runMcpServer().catch((err) => {
    console.error('JayVis.dev MCP server failed:', err);
    process.exit(1);
  });
}
