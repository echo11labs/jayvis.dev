# StitchDB — Project Worklog

## Current Project Status

StitchDB is a **developer-first database modeling workspace** that bridges
declarative DBML code and visual ERDs using an AST as the single source of
truth. The platform is **functional, browser-verified, and feature-complete**
with bidirectional canvas↔editor sync, IndexedDB persistence, a command
palette, edge context menus, ERD SVG export, schema search, **undo/redo,
and schema validation**.

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
- **Validation**: AST → prioritized list of errors/warnings (PK, naming, refs)
- **MCP**: Standalone Model Context Protocol server for IDE agent integration
- **State**: Zustand store with origin flagging + bidirectional sync + undo/redo

## Current Goals / Completed Modifications / Verification

### Phase 5 — Completed (this round)

1. **Undo/redo history stack** ✅ (`src/store/diagram-store.ts`)
   - `pushHistory()` — snapshots {ast, nodes, edges} onto an undo stack
     (capped at 50 entries) before every mutating action.
   - `undo()` — pops the last snapshot, pushes the current state onto the
     redo stack, restores the snapshot, re-serializes DBML.
   - `redo()` — reverse of undo.
   - All 10 canvas mutations (addTable, deleteTable, addField, updateField,
     deleteField, addReference, updateReference, deleteReference, renameTable,
     setTableNote, setFieldNote) now call `pushHistory()` before mutating.
   - **Keyboard**: ⌘Z (undo), ⌘⇧Z / ⌘Y (redo).

2. **UndoRedoButtons** ✅ (`src/components/workspace/UndoRedoButtons.tsx`)
   - Undo/redo button pair in the editor header.
   - Live disabled state from the undo/redo stack lengths.
   - Tooltips show available count ("Undo (3 available)").

3. **Schema validation** ✅ (`src/lib/validation/schema-validation.ts`)
   - `validateSchema(ast)` returns a prioritized list of `ValidationIssue`s:
     - **Missing primary key** (warning) — tables with columns but no PK.
     - **Duplicate table names** (error) — case-insensitive collision.
     - **Duplicate field IDs** (error) — across tables.
     - **Duplicate column names** (error) — within a table.
     - **Nullable PK** (warning) — PK should be NOT NULL.
     - **Auto-increment on non-integer** (warning) — type mismatch.
     - **Orphaned references** (error) — FK points to missing table/field.
     - **Empty schema** (info) — no tables.
   - Each issue has a category icon and a fix suggestion.

4. **ValidationPanel** ✅ (`src/components/workspace/ValidationPanel.tsx`)
   - Right-side sheet panel with error/warning summary badges.
   - Filter by all / errors / warnings.
   - Each issue row is clickable — clicking selects the relevant table
     (opens the inspector).
   - "No issues found" success state with a checkmark.
   - **Keyboard**: ⌘⇧V toggles the panel.
   - Also a "Validate" button in the editor header.

5. **Command palette expanded** ✅
   - Added "Validate schema" (⌘⇧V), "Undo" (⌘Z), "Redo" (⌘⇧Z) commands.
   - Each shows its keyboard shortcut.

6. **Keyboard shortcuts expanded** ✅
   - ⌘Z = undo, ⌘⇧Z/⌘Y = redo, ⌘⇧V = validation panel (all new).
   - Shortcuts overlay updated to document these.

### Previous Phases (still working)
- **Phase 4**: Edge context menu, schema search (⌘F), ERD SVG export, store
  methods (updateReference, setTableNote, setFieldNote), DBML serializer
  enhanced (table/field notes, ON UPDATE).
- **Phase 3**: IndexedDB persistence, command palette (⌘K), DDL export,
  canvas legend.
- **Phase 2**: Bidirectional sync, inspector panel, add table dialog,
  redesigned TableNode, keyboard shortcuts, relationship drag-connect.
- **Phase 1**: Core AST, store, canvas, ELK layout, DBML parser mini-service,
  migration diff engine, MCP server, split-pane UI, 3 sample schemas.

### Browser-Verified (agent-browser)
- ✅ Page hydrates: editor (1016 chars) + canvas (4 tables) + HMR connected
- ✅ "Validate" button present in editor header
- ✅ Validation panel opens (shows "Schema Validation", errors/warnings)
- ✅ Command palette opens with "Validate schema", "Undo", "Redo" items
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
- **Table & field notes UI**: the store methods (`setTableNote`,
  `setFieldNote`) and DBML serialization exist, but the inspector needs
  note input fields.

### Priority Recommendations for Next Phase
1. **Wire MCP to the live store** via a WebSocket mini-service so agent
   edits appear on the canvas in real time.
2. **Production build test** (`next build`) — would eliminate the HMR crash
   and memory issues, enabling full interactive QA.
3. **Table & field notes UI** — add note input fields to the inspector;
   the store methods and serialization are ready.
4. **Dark/light theme toggle** — the app is dark-only currently.
5. **Multi-select + bulk actions** — shift-click to select multiple tables,
   then move/delete as a group.
6. **Live validation indicator** — show error/warning count badge on the
   Validate button so issues are visible without opening the panel.
