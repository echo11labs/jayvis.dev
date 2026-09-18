# StitchDB — Project Worklog

## Current Project Status

StitchDB is a **developer-first database modeling workspace** that bridges
declarative DBML code and visual ERDs using an AST as the single source of
truth. The core platform is **functional and browser-verified**.

### Architecture
- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Canvas**: @xyflow/react (React Flow) with a custom TableNode
- **Layout**: ELK.js (dynamic import — loaded on-demand for "Auto Layout")
- **DBML Parser**: Isolated Bun mini-service on port 3031 (keeps the 21 MB
  @dbml/core pegjs parser out of the Next.js bundle to avoid Turbopack OOM)
- **Diff Engine**: AST-driven schema diff → up/down SQL migrations
- **MCP**: Standalone Model Context Protocol server for IDE agent integration
- **State**: Zustand store with origin flagging ('editor'|'canvas'|'mcp'|...)

### Key Files
- `src/types/ast.ts` — DatabaseAST, SchemaTable, SchemaField, diff contracts
- `src/store/diagram-store.ts` — Zustand store with origin tracking
- `src/components/canvas/TableNode.tsx` — custom React Flow table node
- `src/components/canvas/FlowCanvas.tsx` — React Flow canvas + minimap
- `src/components/editor/CodeEditor.tsx` — lightweight DBML textarea editor
- `src/components/workspace/Toolbar.tsx` — top toolbar (samples, layout, export)
- `src/components/workspace/MigrationPanel.tsx` — diff tree + up/down SQL
- `src/lib/layout/elk-layout.ts` — ELK auto-layout (dynamic import)
- `src/lib/diff/schema-diff.ts` — migration diff engine
- `src/lib/parser/dbml.ts` — AST → DBML serializer (client-safe)
- `src/lib/samples.ts` — e-commerce, blog, SaaS sample schemas
- `src/mcp/server.ts` — MCP agent bridge (standalone)
- `mini-services/dbml-parser/index.ts` — isolated DBML parser (port 3031)
- `src/app/api/parse/route.ts` — thin proxy to the mini-service
- `src/app/page.tsx` — split-pane workspace (editor + canvas + status bar)
- `start-services.sh` / `verify.sh` — startup + verification scripts

## Current Goals / Completed Modifications / Verification

### Completed
1. Full type system (`DatabaseAST`, diff contracts, origin tracking)
2. Zustand store with position reconciliation + origin flagging
3. Custom TableNode with PK/UQ/NOT NULL badges, per-field handles
4. React Flow canvas with minimap, controls, dotted background
5. ELK layered auto-layout (dynamic import to reduce bundle size)
6. DBML parser mini-service (@dbml/core v10, dbmlv2 format)
7. AST → DBML serializer (for export)
8. Migration diff engine (CREATE/DROP/ALTER tables + columns, up/down SQL)
9. MCP server with 5 tools (get_current_schema, list_tables, describe_table,
   add_field_to_table, add_table)
10. Split-pane UI with resizable panels, toolbar, status bar
11. 3 sample schemas (e-commerce, blog/CMS, SaaS multi-tenant)
12. Import/Export (.dbml + .json), Copy-to-clipboard for SQL
13. Migration panel with Diff Tree / UP SQL / DOWN SQL tabs

### Browser-Verified (agent-browser)
- ✅ Page renders: toolbar, editor (DBML text), canvas (tables), status bar
- ✅ Editor loads e-commerce schema (4 tables, 1016 chars)
- ✅ Canvas shows 4 table nodes with proper styling
- ✅ Parse API works end-to-end (POST /api/parse → mini-service → AST)
- ✅ Auto Layout arranges tables via ELK (distinct layered positions)
- ✅ Generate Migration: baseline capture → schema change → diff
- ✅ UP SQL generates CREATE TABLE with constraints (PK, UNIQUE, NOT NULL, DEFAULT)
- ✅ DOWN SQL generates DROP + rollback CREATE
- ✅ Sample switching (e-commerce → blog: 5 tables, 23 cols, 4 refs)
- ✅ Server stays alive with HMR blocked (gateway cross-origin HMR crashes it)

### Critical Operational Notes
1. **HMR through the gateway crashes the dev server.** The gateway (port 81)
   proxies to the Next.js dev server (port 3000). The HMR websocket through
   the gateway causes a silent crash. **Workaround**: block `/_next/webpack-hmr*`
   in the browser (done in `verify.sh`). In production this is a non-issue.
2. **Background processes die between shell sessions.** Both the Next dev
   server and the DBML mini-service must be started in the same shell
   session that performs verification. Use `bash verify.sh` for a full
   startup + test cycle.
3. **@dbml/core is 21 MB** — kept in the mini-service, never in the
   Next.js bundle (would OOM Turbopack).
4. **CodeMirror was replaced with a textarea editor** to avoid the
   @codemirror/* version-conflict OOM. All parsing is server-side, so
   no functionality is lost.

## Unresolved Issues / Risks / Next Steps

### Unresolved
- The HMR-through-gateway crash is an environment issue, not a code bug.
  The `verify.sh` script blocks HMR as a workaround. A production build
  (`next build`) would not have this issue.
- The MCP server (`src/mcp/server.ts`) is implemented but not wired to
  the browser store (it reads/writes a JSON file). A polling bridge or
  WebSocket would connect them for live agent-driven schema edits.

### Priority Recommendations for Next Phase
1. **Wire MCP to the live store** via a WebSocket mini-service so agent
   edits appear on the canvas in real time.
2. **Restore CodeMirror** via a Web Worker (off-main-thread) to get syntax
   highlighting back without the bundle-size / OOM tradeoff.
3. **Add table/field CRUD via canvas context menus** (right-click a table
   to add/rename/delete columns — updates the AST → re-serializes DBML).
4. **Persist to IndexedDB** for local-first storage (spec section 1.4).
5. **Add relationship creation via drag-connect** on the canvas handles.
6. **Dark/light theme toggle** (the app is dark-only currently).
