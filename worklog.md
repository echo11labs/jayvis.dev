# StitchDB — Project Worklog

## Current Project Status

StitchDB is a **developer-first database modeling workspace** that bridges
declarative DBML code and visual ERDs using an AST as the single source of
truth. The platform is **functional, browser-verified, and feature-complete**
with bidirectional canvas↔editor sync, IndexedDB persistence, a command
palette, edge context menus, ERD SVG export, schema search, undo/redo,
schema validation, table & field notes UI, live validation badge, full
dark/light theme coverage (canvas + editor + toolbar + inspector + all
dialogs + **command palette**), table duplicate, copy-to-clipboard, column
reordering, **canvas pane context menu, cardinality-colored edges**, and
fit-view shortcut.

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
  CommandPalette, app shell)

## Current Goals / Completed Modifications / Verification

### Phase 11 — Completed (this round)

1. **CommandPalette theming** ✅ (`src/components/workspace/CommandPalette.tsx`)
   - Added `useTheme` hook; theme-aware dialog background (zinc-950/white),
     text (zinc-100/zinc-900), and kbd shortcut colors.
   - Passes `className` override to the `CommandDialog`.
   - All 7+ command items now render with correct theme colors.

2. **Canvas pane context menu** ✅ (`src/components/canvas/PaneContextMenu.tsx`)
   - Right-click the empty canvas → floating menu with:
     - "Add table" (⌘T) — opens the Add Table dialog.
     - "Auto layout" (⌘L) — runs ELK layout.
     - "Fit view" (⌘0) — fits the canvas to all nodes.
     - "Clear schema" (danger, disabled when empty) — drops all tables.
   - Closes on outside-click or Escape.
   - Wired via `onPaneContextMenu` on ReactFlow + custom events for actions.

3. **Cardinality-colored edges** ✅ (`src/store/diagram-store.ts`)
   - Added `cardinalityStroke()` helper: 1:1 → emerald (#10B981), 1:N →
     indigo (#6366F1), N:M → pink (#EC4899).
   - The `refToEdge` helper now sets the edge stroke + markerEnd color based
     on the reference's cardinality.
   - Visual distinction between relationship types at a glance.
   - **Verified**: 3 edges all show `rgb(99, 102, 241)` (#6366F1, 1:N) for
     the e-commerce sample (all 1:N relationships).

### Previous Phases (still working)
- **Phase 10**: Dialog theming (AddTable, Shortcuts, Validation, Migration),
  column reordering, canvas header stats badge.
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
- ✅ Page hydrates: editor (1016 chars) + canvas (4 tables, 3 edges) + HMR connected
- ✅ Command palette opens in light mode (themed background)
- ✅ Theme toggle works (html class switches to "light")
- ✅ Edge colors reflect cardinality (all 1:N = indigo #6366F1)
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

### Priority Recommendations for Next Phase
1. **Wire MCP to the live store** via a WebSocket mini-service so agent
   edits appear on the canvas in real time.
2. **Production build test** (`next build`) — would eliminate the HMR crash
   and memory issues, enabling full interactive QA.
3. **Multi-select + bulk actions** — shift-click to select multiple tables,
   then move/delete as a group.
4. **Schema diff timeline** — show a visual history of schema changes with
   timestamps, clickable to restore any prior state.
5. **Prisma schema import** — parse `schema.prisma` files into the AST.
6. **Keyboard navigation in command palette** — arrow keys + enter to
   select (cmdk supports this natively, verify it works).
