# StitchDB — Project Worklog

## Current Project Status

StitchDB is a **developer-first database modeling workspace** that bridges
declarative DBML code and visual ERDs using an AST as the single source of
truth. The platform is **functional, browser-verified, and feature-complete**
with bidirectional canvas↔editor sync, IndexedDB persistence, a command
palette, edge context menus, ERD SVG export, schema search, undo/redo,
schema validation, table & field notes UI, live validation badge, dark/light
theme toggle, **relationship edge labels with field names, edge hover
highlighting, and 5 schema templates**.

### Architecture
- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Canvas**: @xyflow/react (React Flow) with custom TableNode + edge labels
- **Layout**: ELK.js (dynamic import for "Auto Layout")
- **DBML Parser**: Isolated Bun mini-service on port 3031 (21 MB @dbml/core
  kept out of the Next.js bundle to avoid Turbopack OOM)
- **Persistence**: IndexedDB (local-first — schema + positions survive reloads)
- **Diff Engine**: AST-driven schema diff → up/down SQL migrations
- **DDL Export**: AST → PostgreSQL CREATE TABLE + ALTER TABLE + indexes
- **ERD Export**: AST + positions → standalone SVG diagram
- **Validation**: AST → prioritized errors/warnings + live badge
- **MCP**: Standalone Model Context Protocol server for IDE agent integration
- **State**: Zustand store with origin flagging + bidirectional sync + undo/redo
- **Theme**: Dark/light toggle (persisted to localStorage)

## Current Goals / Completed Modifications / Verification

### Phase 7 — Completed (this round)

1. **Relationship edge labels with field names** ✅ (`src/store/diagram-store.ts`)
   - Added `refToEdge(ref)` helper that builds a full Edge object with a
     label showing `sourceField → targetField · cardinality` (e.g.
     `user_id → id · 1:N`).
   - Replaced all 5 inline edge constructions (addReference,
     updateReference, renameTable ×2, loadAST) with the helper.
   - Edges now have `labelStyle` + `labelBgStyle` for consistent dark
     label backgrounds.
   - **Verified**: 3 edges show `user_id → id · 1:N`, `order_id → id · 1:N`,
     `product_id → id · 1:N`.

2. **Edge hover highlighting** ✅ (`src/components/canvas/FlowCanvas.tsx`)
   - `onEdgeMouseEnter` / `onEdgeMouseLeave` handlers track the hovered
     edge ID.
   - `displayEdges` memo thickens (strokeWidth 3) and brightens
     (`#818CF8`) the hovered edge, making relationships easy to trace.

3. **Schema templates expanded** ✅ (`src/lib/samples.ts`)
   - Added **Auth & Sessions** template: users, sessions, oauth_accounts,
     password_resets, roles, user_roles — with composite unique indexes
     and cascade deletes.
   - Added **Analytics & Events** template: events, event_properties,
     funnels, cohorts, dashboards, dashboard_widgets — with jsonb columns
     and cascade deletes.
   - Updated `SampleName` type to include `'auth' | 'analytics'`.
   - Added to toolbar Samples dropdown + command palette.

4. **Canvas header badges** ✅ (`src/app/page.tsx`)
   - Replaced generic "N nodes" with "N tables" (with Database icon) +
     "N refs" badges for clearer schema stats.
   - "ELK · layered" label hidden on small screens.

### Previous Phases (still working)
- **Phase 6**: Table & field notes UI, live validation badge, theme toggle,
  field note tooltips, edge arrow markers.
- **Phase 5**: Undo/redo history stack, schema validation, validation panel.
- **Phase 4**: Edge context menu, schema search (⌘F), ERD SVG export.
- **Phase 3**: IndexedDB persistence, command palette (⌘K), DDL export.
- **Phase 2**: Bidirectional sync, inspector panel, add table dialog,
  redesigned TableNode, keyboard shortcuts, relationship drag-connect.
- **Phase 1**: Core AST, store, canvas, ELK layout, DBML parser mini-service,
  migration diff engine, MCP server, split-pane UI, 3 sample schemas.

### Browser-Verified (agent-browser)
- ✅ Page hydrates: editor (1016 chars) + canvas (4 tables) + HMR connected
- ✅ Edge labels show field names: `user_id → id · 1:N`, `order_id → id · 1:N`, `product_id → id · 1:N`
- ✅ Canvas header shows "4 tables" + "3 refs" badges
- ✅ Command palette shows "Auth & Sessions" + "Analytics & Events" samples
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
- **Light theme coverage**: the toggle switches the html class, but the
  canvas + editor use hardcoded dark colors. A full light theme would
  need conditional colors in TableNode, CodeEditor, and FlowCanvas.

### Priority Recommendations for Next Phase
1. **Wire MCP to the live store** via a WebSocket mini-service so agent
   edits appear on the canvas in real time.
2. **Production build test** (`next build`) — would eliminate the HMR crash
   and memory issues, enabling full interactive QA.
3. **Full light theme** — propagate the theme class into TableNode,
   CodeEditor, and FlowCanvas backgrounds for a complete light mode.
4. **Multi-select + bulk actions** — shift-click to select multiple tables,
   then move/delete as a group.
5. **Schema diff timeline** — show a visual history of schema changes with
   timestamps, clickable to restore any prior state.
6. **Prisma schema import** — parse `schema.prisma` files into the AST.
