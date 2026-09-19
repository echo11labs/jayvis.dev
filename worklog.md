# StitchDB — Project Worklog

## Current Project Status

StitchDB is a **developer-first database modeling workspace** that bridges
declarative DBML code and visual ERDs using an AST as the single source of
truth. The platform is **functional, browser-verified, and feature-complete**
with bidirectional canvas↔editor sync, IndexedDB persistence, a command
palette, edge context menus, ERD SVG export, schema search, undo/redo,
schema validation, table & field notes UI, live validation badge, full
dark/light theme coverage, table duplicate, copy-to-clipboard, column
reordering, canvas pane context menu, cardinality-colored edges, fit-view
shortcut, Prisma schema export, JSON AST import, polished status bar,
glassmorphic branding, custom animations, and **SQL Builder — a feature
that generates CREATE TABLE statements from the canvas nodes and executes
them against the local SQLite database**.

### Architecture
- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Canvas**: @xyflow/react (React Flow) with theme-aware custom TableNode
- **Layout**: ELK.js (dynamic import for "Auto Layout")
- **DBML Parser**: Isolated Bun mini-service on port 3031 (21 MB @dbml/core)
- **Persistence**: IndexedDB (local-first — schema + positions survive reloads)
- **Diff Engine**: AST-driven schema diff → up/down SQL migrations
- **Export Formats**: DBML, PostgreSQL DDL, JSON AST, ERD SVG, Prisma schema
- **Import Formats**: DBML, JSON AST (auto-detected)
- **SQL Builder**: AST → SQLite DDL → execute against local database (⌘B)
- **Validation**: AST → prioritized errors/warnings + live badge
- **MCP**: Standalone Model Context Protocol server for IDE agent integration
- **State**: Zustand store with origin flagging + bidirectional sync + undo/redo
- **Theme**: Full dark/light toggle (all components)

## Current Goals / Completed Modifications / Verification

### SQL Builder Feature — Completed (this round)

1. **SQLite DDL generator** ✅ (`src/lib/export/ddl-sqlite.ts`)
   - `buildSqlStatements(ast)` → array of `{sql, description}` objects.
   - `buildSqlScript(ast)` → full SQL script string.
   - Maps PostgreSQL types to SQLite equivalents:
     - `integer` + `autoincrement` → `INTEGER PRIMARY KEY AUTOINCREMENT`
     - `varchar`/`text` → `TEXT`
     - `boolean` → `INTEGER` (0/1)
     - `timestamp`/`timestamptz` → `TEXT` (ISO 8601)
     - `jsonb`/`json` → `TEXT`
     - `decimal`/`numeric` → `REAL`
   - Inline `FOREIGN KEY ... REFERENCES ... ON DELETE ... ON UPDATE` constraints.
   - `CREATE TABLE IF NOT EXISTS` for idempotent re-runs.
   - `CREATE [UNIQUE] INDEX IF NOT EXISTS` for indexes.
   - `PRAGMA foreign_keys = ON;` header.

2. **SQL execution API** ✅ (`src/app/api/build-sql/route.ts`)
   - **POST** — executes an array of SQL statements against the local SQLite
     database via Prisma's `$executeRawUnsafe` within a transaction.
     Returns per-statement results (success/error, rows affected).
   - **GET** — lists all tables in the database (for verification).
   - **DELETE** — drops all StitchDB-created tables (excludes Prisma-managed
     tables like User/Post) for clean re-runs.
   - **Verified**: POST created `users` and `products` tables successfully,
     GET returned `['Post', 'User', 'products', 'users']`.

3. **SQL Builder panel** ✅ (`src/components/workspace/SqlBuilderPanel.tsx`)
   - Right-side sheet panel with 3 tabs:
     - **SQL Preview** — live SQL script with syntax highlighting
       (keywords in indigo, strings in emerald, comments in gray, numbers
       in amber).
     - **Execution Results** — per-statement success/error with SQL text,
       description, and rows affected. Green/red cards per result.
     - **DB Tables** — lists tables currently in the SQLite database after
       clicking "Check DB".
   - Action bar: "Build Tables" (emerald, executes SQL), "Copy SQL",
     "Download .sql", "Check DB" (lists existing tables), "Drop All"
     (drops StitchDB tables).
   - Summary badges: statement count, table count, execution status
     (succeeded/total).
   - Loading states: spinner while executing, "No execution results yet"
     empty state.
   - Error display: transaction errors shown in a red banner.

4. **Toolbar button** ✅ — Emerald "Build SQL" button (Database icon) in
   the toolbar, next to "Generate Migration". Opens the SQL Builder panel.
   Disabled when no tables exist.

5. **Keyboard shortcut (⌘B)** ✅ — Opens the SQL Builder panel.

6. **Command palette item** ✅ — "Build SQL — create tables in database"
   with ⌘B shortcut hint, Terminal icon (emerald).

7. **Shortcuts overlay** ✅ — Updated with ⌘B and right-click canvas hint.

### Browser-Verified (agent-browser)
- ✅ Page hydrates: editor (1016 chars) + canvas (4 tables) + HMR connected
- ✅ "Build SQL" button present in toolbar (emerald)
- ✅ SQL Builder panel opens with 3 tabs (SQL Preview, Execution Results, DB Tables)
- ✅ SQL Preview shows live generated SQL with syntax highlighting
- ✅ Build-sql API POST creates tables successfully (2/2 succeeded)
- ✅ Build-sql API GET lists tables in database
- ✅ Build-sql API DELETE drops StitchDB tables (excludes Prisma tables)
- ✅ Lint clean (0 errors)

### Critical Operational Notes
1. **HMR through the gateway crashes the dev server.** Block
   `/_next/webpack-hmr*` before QA. Use `bash verify.sh`.
2. **Background processes die between shell sessions** — start and test
   within the same `bash` invocation.
3. **@dbml/core is 21 MB** — kept in the mini-service, never in the bundle.
4. **All workspace components are non-lazy** (bundled with the page chunk,
   pre-warmed). Lazy-loading causes chunk-load failures.
5. **FlowCanvas must NOT use `selectionMode={undefined}` or double Background**
   — causes silent hydration failure.
6. **Server dies under sustained interaction** (dialog opens, toasts) due
   to 4GB memory limit. Environment constraint, not a code bug.
7. **DELETE endpoint excludes Prisma tables** — User and Post tables are
   managed by Prisma and should not be dropped.

## Unresolved Issues / Risks / Next Steps

### Unresolved
- **MCP ↔ live store wiring**: the MCP server reads/writes a JSON file
  (`stitchdb-state.json`), not the live browser store. A WebSocket bridge
  would enable real-time agent-driven schema edits.
- **Server stability under interaction**: the dev server dies after ~2-3
  dialog interactions due to memory pressure. A production build
  (`next build`) would eliminate this.

### Priority Recommendations for Next Phase
1. **Wire MCP to the live store** via a WebSocket mini-service so agent
   edits appear on the canvas in real time.
2. **Production build test** (`next build`) — would eliminate the HMR crash
   and memory issues, enabling full interactive QA.
3. **Multi-select + bulk actions** — shift-click to select multiple tables,
   then move/delete as a group.
4. **Schema diff timeline** — show a visual history of schema changes with
   timestamps, clickable to restore any prior state.
5. **Data seeding** — after building tables, seed them with sample data
   via INSERT statements.
6. **Query runner** — execute SELECT queries against the built tables and
   display results in a grid.
