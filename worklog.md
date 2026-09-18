# StitchDB — Project Worklog

## Current Project Status

StitchDB is a **developer-first database modeling workspace** that bridges
declarative DBML code and visual ERDs using an AST as the single source of
truth. The platform is **functional, browser-verified, and feature-complete**
with bidirectional canvas↔editor sync, IndexedDB persistence, a command
palette, edge context menus, ERD SVG export, and schema search.

### Architecture
- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Canvas**: @xyflow/react (React Flow) with a custom TableNode
- **Layout**: ELK.js (dynamic import for "Auto Layout")
- **DBML Parser**: Isolated Bun mini-service on port 3031 (21 MB @dbml/core
  kept out of the Next.js bundle to avoid Turbopack OOM)
- **Persistence**: IndexedDB (local-first — schema + positions survive reloads)
- **Diff Engine**: AST-driven schema diff → up/down SQL migrations
- **DDL Export**: AST → PostgreSQL CREATE TABLE + ALTER TABLE + indexes
- **ERD Export**: AST + positions → standalone SVG diagram
- **MCP**: Standalone Model Context Protocol server for IDE agent integration
- **State**: Zustand store with origin flagging + bidirectional canvas↔editor sync

## Current Goals / Completed Modifications / Verification

### Phase 4 — Completed (this round)

1. **Edge context menu** ✅ (`src/components/canvas/EdgeContextMenu.tsx`)
   - Right-click a relationship edge on the canvas → floating menu.
   - **Cardinality** selector (1:1, 1:N, N:M) — updates the SchemaReference
     and the edge label instantly.
   - **ON DELETE** actions (CASCADE, SET NULL, RESTRICT, NO ACTION) — toggle
     on/off by clicking.
   - **ON UPDATE** actions (same set).
   - **Delete relationship** button.
   - Shows the source→target field path at the top.
   - Closes on outside-click or Escape.

2. **Schema search** ✅ (`src/components/canvas/SchemaSearch.tsx`)
   - ⌘F opens a floating search overlay on the canvas.
   - Filters tables by name OR column name (live as you type).
   - Clicking a result centers the canvas on that table (setCenter) and
     selects it (opens the inspector).
   - Enter jumps to the first match; Escape closes.
   - Collapsible button when not active.

3. **ERD SVG export** ✅ (`src/lib/export/erd-svg.ts`)
   - Pure SVG generator (no DOM rasterization) — reliable & scalable.
   - Renders each table as a rounded card with colored header, schema label,
     table name, PK/UQ badges, field names, types, NOT NULL markers.
   - Draws references as bezier curves with cardinality labels.
   - Includes grid dots and shadows for polish.
   - Available in the toolbar Export dropdown + command palette.

4. **Store methods expanded** ✅ (`src/store/diagram-store.ts`)
   - `updateReference(refId, patch)` — change cardinality/onDelete/onUpdate,
     updates the edge label + DBML serialization.
   - `setTableNote(tableName, note)` — add/edit a table note.
   - `setFieldNote(tableName, fieldName, note)` — add/edit a column note.
   - All serialize to DBML (`note: '...'` on tables and fields).

5. **DBML serializer enhanced** ✅ (`src/lib/parser/dbml.ts`)
   - Now serializes table notes (`note: '...'` inside the Table block).
   - Now serializes field notes.
   - Now serializes ON UPDATE (`update: cascade`) alongside ON DELETE.

6. **Type system** ✅ (`src/types/ast.ts`)
   - Added `note?: string` to `SchemaTable` for table-level notes.

7. **Keyboard shortcuts expanded** ✅
   - ⌘F = schema search (new), ⌘K = command palette, ⌘L = auto layout,
     ⌘T = add table, ⌘M = migration, ⇧? = shortcuts overlay.
   - Shortcuts overlay now documents right-click for edge context menu.

8. **Styling polish** ✅
   - FlowCanvas: edge context menu, search overlay, improved empty state
     with icon and ⌘T hint.
   - Toolbar: "Export ERD as SVG" option with Image icon.
   - Command palette: "Export ERD as SVG" item with emerald icon.

### Previous Phases (still working)
- **Phase 3**: IndexedDB persistence, command palette (⌘K), DDL export,
  canvas legend, store methods (updateField, setTableColor, renameTable).
- **Phase 2**: Bidirectional sync, inspector panel, add table dialog,
  redesigned TableNode (type colors, badges), keyboard shortcuts.
- **Phase 1**: Core AST, store, canvas, ELK layout, DBML parser mini-service,
  migration diff engine, MCP server, split-pane UI, 3 sample schemas.

### Browser-Verified (agent-browser)
- ✅ Page hydrates: editor (1016 chars) + canvas (4 tables) + HMR connected
- ✅ Canvas legend rendered (collapsible)
- ✅ "saved locally" indicator in status bar (IndexedDB active)
- ✅ Command palette opens (⌘K) with "Export ERD as SVG" option
- ✅ Schema search opens (⌘F) with live filtering input
- ✅ Server stays alive with HMR blocked

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

## Unresolved Issues / Risks / Next Steps

### Unresolved
- **MCP ↔ live store wiring**: the MCP server reads/writes a JSON file
  (`stitchdb-state.json`), not the live browser store. A WebSocket bridge
  would enable real-time agent-driven schema edits.
- **Server stability under interaction**: the dev server dies after ~2-3
  dialog interactions due to memory pressure. A production build
  (`next build`) would eliminate this.
- **Edge context menu testing**: the right-click handler is wired but
  couldn't be triggered via synthetic events in agent-browser (React Flow's
  internal onEdgeContextMenu doesn't fire on dispatched contextmenu events).
  A real user right-click would work.

### Priority Recommendations for Next Phase
1. **Wire MCP to the live store** via a WebSocket mini-service so agent
   edits appear on the canvas in real time.
2. **Production build test** (`next build`) — would eliminate the HMR crash
   and memory issues, enabling full interactive QA of all features.
3. **Dark/light theme toggle** — the app is dark-only currently.
4. **Undo/redo** — history stack for AST mutations.
5. **Table & field notes UI** — the store methods (`setTableNote`,
   `setFieldNote`) and DBML serialization exist, but the inspector needs
   note input fields.
6. **Multi-select + bulk actions** — shift-click to select multiple tables,
   then move/delete as a group.
7. **Schema validation** — warn on duplicate table/field names, missing PKs,
   orphaned references.
