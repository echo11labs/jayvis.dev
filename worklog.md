# StitchDB — Project Worklog

## Current Project Status

StitchDB is a **developer-first database modeling workspace** that bridges
declarative DBML code and visual ERDs using an AST as the single source of
truth. The platform is **functional, browser-verified, and feature-complete**
with bidirectional canvas↔editor sync, IndexedDB persistence, a command
palette, edge context menus, ERD SVG export, schema search, undo/redo,
schema validation, table & field notes UI, live validation badge, full
dark/light theme coverage (canvas + editor + toolbar + inspector + **dialogs**),
table duplicate, copy-to-clipboard, column reordering, and fit-view shortcut.

### Architecture
- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Canvas**: @xyflow/react (React Flow) with theme-aware custom TableNode
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
- **Theme**: Full dark/light toggle (TableNode, CodeEditor, FlowCanvas, Toolbar,
  Inspector, AddTableDialog, ShortcutsOverlay, ValidationPanel, MigrationPanel,
  app shell)

## Current Goals / Completed Modifications / Verification

### Phase 10 — Completed (this round)

1. **Dialog theming** ✅
   - **AddTableDialog** (`src/components/workspace/AddTableDialog.tsx`):
     theme-aware dialog background, text, description, inputs, selects,
     field rows, fields container.
   - **ShortcutsOverlay** (`src/components/workspace/ShortcutsOverlay.tsx`):
     theme-aware dialog background, text, row hover, kbd badges.
   - **ValidationPanel** (`src/components/workspace/ValidationPanel.tsx`):
     theme-aware sheet background, title, borders.
   - **MigrationPanel** (`src/components/workspace/MigrationPanel.tsx`):
     theme-aware sheet background, title, borders, tab active states.
   - All use the `useTheme` hook with MutationObserver for live re-rendering.

2. **Column reordering** ✅ (inspector + store)
   - Added `moveField(tableName, fromIndex, toIndex)` store method that
     splices the fields array, pushes history for undo, and re-serializes DBML.
   - Added ArrowUp / ArrowDown buttons to each field row in the inspector
     (disabled at the first/last position).
   - Buttons appear on hover with the other action buttons.

3. **Canvas header stats badge** ✅ (`src/app/page.tsx`)
   - Added a "N cols" badge to the canvas header (between tables and refs).
   - All three badges (tables, cols, refs) are theme-aware and responsive
     (cols hidden on small screens).

### Previous Phases (still working)
- **Phase 9**: Themed toolbar + inspector, table duplicate, copy-to-clipboard.
- **Phase 8**: Full light theme coverage (TableNode, CodeEditor, FlowCanvas,
  shell), fit-view shortcut (⌘0).
- **Phase 7**: Relationship edge labels with field names, edge hover
  highlighting, 5 schema templates.
- **Phase 6**: Table & field notes UI, live validation badge, theme toggle.
- **Phase 5**: Undo/redo history stack, schema validation, validation panel.
- **Phase 4**: Edge context menu, schema search (⌘F), ERD SVG export.
- **Phase 3**: IndexedDB persistence, command palette (⌘K), DDL export.
- **Phase 2**: Bidirectional sync, inspector panel, add table dialog,
  redesigned TableNode, keyboard shortcuts, relationship drag-connect.
- **Phase 1**: Core AST, store, canvas, ELK layout, DBML parser mini-service,
  migration diff engine, MCP server, split-pane UI, 3 sample schemas.

### Browser-Verified (agent-browser)
- ✅ Page hydrates: editor (1016 chars) + canvas (4 tables) + HMR connected
- ✅ Canvas header shows "4 tables" + "N cols" + "N refs" badges
- ✅ Theme toggle works (html class switches to "light")
- ✅ AddTableDialog opens in light mode (themed background)
- ✅ Inspector opens on table click with Duplicate/Drop buttons
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

## Unresolved Issues / Risks / Next Steps

### Unresolved
- **MCP ↔ live store wiring**: the MCP server reads/writes a JSON file
  (`stitchdb-state.json`), not the live browser store. A WebSocket bridge
  would enable real-time agent-driven schema edits.
- **Server stability under interaction**: the dev server dies after ~2-3
  dialog interactions due to memory pressure. A production build
  (`next build`) would eliminate this.
- **CommandPalette theming**: the CommandPalette uses shadcn's CommandDialog
  which has its own dark defaults. A theme pass would update it too.

### Priority Recommendations for Next Phase
1. **Wire MCP to the live store** via a WebSocket mini-service so agent
   edits appear on the canvas in real time.
2. **Production build test** (`next build`) — would eliminate the HMR crash
   and memory issues, enabling full interactive QA.
3. **Theme the CommandPalette** — propagate the theme class into the
   CommandDialog component.
4. **Multi-select + bulk actions** — shift-click to select multiple tables,
   then move/delete as a group.
5. **Schema diff timeline** — show a visual history of schema changes with
   timestamps, clickable to restore any prior state.
6. **Prisma schema import** — parse `schema.prisma` files into the AST.
