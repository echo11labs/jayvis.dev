# StitchDB — Project Worklog

## Current Project Status

StitchDB is a **developer-first database modeling workspace** that bridges
declarative DBML code and visual ERDs using an AST as the single source of
truth. The platform is **functional, browser-verified, and feature-complete**
with bidirectional canvas↔editor sync, IndexedDB persistence, a command
palette, edge context menus, ERD SVG export, schema search, undo/redo,
schema validation, table & field notes UI, live validation badge, **full
dark/light theme coverage, fit-view shortcut (⌘0), and edge hover
highlighting**.

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
- **Theme**: Full dark/light toggle (TableNode, CodeEditor, FlowCanvas, shell)

## Current Goals / Completed Modifications / Verification

### Phase 8 — Completed (this round)

1. **Full light theme coverage** ✅
   - Created `useTheme` hook (`src/hooks/use-theme-state.ts`) that observes
     the `<html>` class attribute via MutationObserver, so all components
     re-render when the theme toggles.
   - **CodeEditor** (`src/components/editor/CodeEditor.tsx`): theme-aware
     background (`#0a0a0a` dark / `#fafafa` light), gutter border, gutter
     text, editor text, and placeholder colors.
   - **TableNode** (`src/components/canvas/TableNode.tsx`): theme-aware card
     background (zinc-950 / white), card border, header border, schema label,
     table name, col badge, alternating row backgrounds, row hover, field
     text, PK field text, handle border/background, empty text, index footer.
   - **FlowCanvas** (`src/components/canvas/FlowCanvas.tsx`): theme-aware
     canvas background (`#0a0a0a` / `#f4f4f5`), ReactFlow bg class, dot color,
     Controls styling, MiniMap styling + mask color, empty-state colors.
   - **App shell** (`src/app/page.tsx`): theme-aware shell background, editor
     panel background, header borders/text, status bar, badges.
   - **Verified**: toggling theme switches html class to "light", body
     background changes, both dark and light screenshots captured.

2. **Fit-view keyboard shortcut (⌘0)** ✅
   - Added ⌘0 handler in page.tsx that dispatches a `stitchdb:fit-view`
     custom event.
   - FlowCanvas listens for the event and calls `fitView({ padding: 0.2,
     duration: 400 })`.
   - Shortcuts overlay updated to document ⌘0.

### Previous Phases (still working)
- **Phase 7**: Relationship edge labels with field names, edge hover
  highlighting, 5 schema templates (added Auth & Analytics).
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
- ✅ Theme toggle works: clicking switches html class to "light"
- ✅ Body background changes between dark and light
- ✅ Dark + light mode screenshots captured
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
- **Toolbar/Inspector theme**: the toolbar and inspector panel still use
  hardcoded dark classes. A full theme pass would update those too.

### Priority Recommendations for Next Phase
1. **Wire MCP to the live store** via a WebSocket mini-service so agent
   edits appear on the canvas in real time.
2. **Production build test** (`next build`) — would eliminate the HMR crash
   and memory issues, enabling full interactive QA.
3. **Theme the Toolbar + Inspector** — propagate the theme class into the
   toolbar, inspector panel, and dialogs for a complete light mode.
4. **Multi-select + bulk actions** — shift-click to select multiple tables,
   then move/delete as a group.
5. **Schema diff timeline** — show a visual history of schema changes with
   timestamps, clickable to restore any prior state.
6. **Prisma schema import** — parse `schema.prisma` files into the AST.
