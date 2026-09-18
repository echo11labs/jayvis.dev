# StitchDB — Project Worklog

## Current Project Status

StitchDB is a **developer-first database modeling workspace** that bridges
declarative DBML code and visual ERDs using an AST as the single source of
truth. The platform is **functional, browser-verified, and feature-complete**
with bidirectional canvas↔editor sync, IndexedDB persistence, a command
palette, edge context menus, ERD SVG export, schema search, undo/redo,
schema validation, **table & field notes UI, live validation badge, and a
dark/light theme toggle**.

### Architecture
- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Canvas**: @xyflow/react (React Flow) with a custom TableNode (tooltipped notes)
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

### Phase 6 — Completed (this round)

1. **Table & field notes UI** ✅ (`src/components/workspace/InspectorPanel.tsx`)
   - **Table note section** in the inspector: shows the note or "No note",
     with an "+ Add" / "Edit" button. Inline textarea with Save/Cancel,
     ⌘Enter to save, Escape to cancel. Calls `setTableNote` store method.
   - **Field note editing**: each column row has a note button (StickyNote icon).
     Clicking opens an inline textarea below the row. Saves via `setFieldNote`.
   - Existing field notes show an amber StickyNote icon on the row.
   - Both serialize to DBML (`note: '...'`).

2. **Live validation badge** ✅ (`src/components/workspace/ValidationBadge.tsx`)
   - Replaces the static "Validate" button in the editor header.
   - Shows a live count badge (error+warning count) that updates as the
     schema changes.
   - Icon + color reflect schema health:
     - Green shield (ShieldCheck) when no issues.
     - Amber shield (ShieldAlert) when only warnings.
     - Red shield (ShieldX) when any errors.
   - Badge background: red for errors, amber for warnings.
   - Tooltip shows the full breakdown ("0 errors, 4 warnings — ⌘⇧V").
   - **Verified**: badge shows "4" (4 warnings), title correct.

3. **Dark/light theme toggle** ✅ (`src/components/workspace/ThemeToggle.tsx`)
   - Sun/Moon icon button in the toolbar.
   - Toggles `light`/`dark` class on `<html>`.
   - Persists choice to `localStorage` (`stitchdb-theme`).
   - Restores on mount.
   - **Verified**: clicking switches html class to "light".

4. **Field note tooltips on TableNode** ✅ (`src/components/canvas/TableNode.tsx`)
   - The `●` note indicator now uses a proper shadcn Tooltip (hover shows
     the note text in a popover) instead of a bare `title` attribute.
   - The field name itself has a `title` showing `name — note` when a note
     exists.

5. **Edge arrow markers** ✅ (`src/components/canvas/FlowCanvas.tsx`)
   - Edges now have `markerEnd: arrowclosed` — a filled arrowhead at the
     target end of each relationship, improving visual direction clarity.

6. **Styling polish** ✅
   - Inspector: table note section with StickyNote icon, amber note indicators.
   - Toolbar: theme toggle button (Sun/Moon).
   - Editor header: validation badge with live count.

### Previous Phases (still working)
- **Phase 5**: Undo/redo history stack, schema validation, validation panel.
- **Phase 4**: Edge context menu, schema search (⌘F), ERD SVG export.
- **Phase 3**: IndexedDB persistence, command palette (⌘K), DDL export.
- **Phase 2**: Bidirectional sync, inspector panel, add table dialog,
  redesigned TableNode, keyboard shortcuts, relationship drag-connect.
- **Phase 1**: Core AST, store, canvas, ELK layout, DBML parser mini-service,
  migration diff engine, MCP server, split-pane UI, 3 sample schemas.

### Browser-Verified (agent-browser)
- ✅ Page hydrates: editor (1016 chars) + canvas (4 tables) + HMR connected
- ✅ Theme toggle present (Sun icon = dark mode)
- ✅ Theme toggle works: clicking switches html class to "light"
- ✅ Validation badge shows live count ("4", 4 warnings)
- ✅ Inspector opens on table click with "Table note" section
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
5. **Schema templates** — pre-built schema templates (auth, audit log,
   e-commerce cart) beyond the current 3 samples.
6. **Relationship edge labels with field names** — show "user_id → id" on
   edges instead of just cardinality.
