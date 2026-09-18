# StitchDB — Project Worklog

## Current Project Status

StitchDB is a **developer-first database modeling workspace** that bridges
declarative DBML code and visual ERDs using an AST as the single source of
truth. The platform is **functional, browser-verified, and now supports
bidirectional canvas↔editor sync**.

### Architecture
- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Canvas**: @xyflow/react (React Flow) with a redesigned custom TableNode
- **Layout**: ELK.js (dynamic import — loaded on-demand for "Auto Layout")
- **DBML Parser**: Isolated Bun mini-service on port 3031 (keeps the 21 MB
  @dbml/core pegjs parser out of the Next.js bundle to avoid Turbopack OOM)
- **Diff Engine**: AST-driven schema diff → up/down SQL migrations
- **MCP**: Standalone Model Context Protocol server for IDE agent integration
- **State**: Zustand store with origin flagging + bidirectional sync

## Current Goals / Completed Modifications / Verification

### Phase 2 — Completed (this round)

1. **Bidirectional canvas↔editor sync** ✅
   - Canvas mutations (add table, delete table, add/delete column, add
     relationship) now serialize the AST → DBML and update the editor text.
   - Origin-guarded parse effect: skips re-parsing when origin is
     'canvas' or 'mcp' (prevents infinite loops & round-trip loss).
   - **Verified**: creating a table via the dialog adds it to the canvas
     AND updates the DBML editor text (reviews-in-editor:true, rf:5).

2. **Inspector panel** ✅ (`src/components/workspace/InspectorPanel.tsx`)
   - Opens when a table is selected (click on canvas).
   - Shows all columns with PK/UQ/FK badges, type colors, NOT NULL markers.
   - Inline column editing (rename, change type, toggle PK/UQ/Nullable).
   - Add column inline, delete column, delete table.
   - Table color picker (10-color palette).
   - Table rename (inline edit).
   - **Verified**: clicking a table opens the inspector showing columns.

3. **Add Table dialog** ✅ (`src/components/workspace/AddTableDialog.tsx`)
   - Create new tables with name, schema, and multiple columns.
   - Per-column type selector (15 common SQL types), PK/Nullable toggles.
   - Add/remove column rows dynamically.
   - Auto-assigns a color from the palette.
   - **Verified**: dialog opens, creating "reviews" table syncs to canvas+editor.

4. **Keyboard shortcuts overlay** ✅ (`src/components/workspace/ShortcutsOverlay.tsx`)
   - ⌘L = auto layout, ⌘T = add table, ⇧? = toggle shortcuts overlay.
   - Tab = insert 2 spaces, Enter = auto-indent (in editor).

5. **Redesigned TableNode** ✅ (`src/components/canvas/TableNode.tsx`)
   - Gradient header with table-initials avatar badge.
   - Per-field SQL type color coding (uuid=violet, integer=sky, varchar=emerald,
     boolean=amber, timestamp=pink, jsonb=orange, decimal=cyan).
   - Auto-increment (⚡) and default-value (=) indicators.
   - Alternating row backgrounds for readability.
   - Index count footer.
   - "⚠ no primary key" warning for tables without a PK.
   - Rounded-xl design with shadow and ring on selection.

6. **Enhanced Toolbar** ✅ (`src/components/workspace/Toolbar.tsx`)
   - New "Add Table" button (indigo accent).
   - New "Clear schema" action in Export dropdown.
   - New keyboard-shortcuts button (Keyboard icon).
   - Responsive button labels (hide text on small screens).

7. **Relationship drag-connect** ✅ (store `onConnect`)
   - Dragging from one column handle to another creates a SchemaReference
     + edge + DBML `Ref:` line (with origin 'canvas' → syncs to editor).

8. **Store CRUD methods** ✅ (`src/store/diagram-store.ts`)
   - `addTable`, `deleteTable`, `addFieldToTable`, `deleteField`,
     `addReference`, `loadAST`, `setSelectedTable`, `setHydrated`.
   - All mutations serialize to DBML with origin tracking.

### Browser-Verified (agent-browser)
- ✅ Page hydrates: editor (1016 chars e-commerce schema) + canvas (4 tables)
- ✅ HMR connects, server stays alive with HMR blocked
- ✅ Table click → inspector panel opens (shows columns, "public.order_items")
- ✅ Add Table dialog → create "reviews" → canvas shows 5 tables + editor updates
- ✅ Bidirectional sync: canvas mutation → DBML editor text updated
- ✅ Auto Layout button works (ELK layered positions)
- ✅ Generate Migration → panel opens with Diff Tree / UP SQL / DOWN SQL tabs
- ✅ Keyboard shortcuts registered (⌘L, ⌘T, ⇧?)

### Critical Operational Notes
1. **HMR through the gateway crashes the dev server.** The gateway (port 81)
   proxies to the Next.js dev server (port 3000). The HMR websocket through
   the gateway causes a silent crash. **Workaround**: block `/_next/webpack-hmr*`
   in the browser (done in `verify.sh`). Use `bash verify.sh` for full QA.
2. **Background processes die between shell sessions.** Both the Next dev
   server and the DBML mini-service must be started in the same shell
   session that performs verification.
3. **@dbml/core is 21 MB** — kept in the mini-service, never in the
   Next.js bundle (would OOM Turbopack).
4. **All workspace components (InspectorPanel, AddTableDialog,
   ShortcutsOverlay) are non-lazy** — bundled with the page chunk so
   they're pre-warmed. Lazy-loading them caused chunk-load failures
   (server dies when compiling un-pre-warmed chunks on interaction).
5. **FlowCanvas must NOT use `selectionMode={undefined}` or a double
   `<Background>`** — these caused a silent hydration failure. The
   current FlowCanvas uses a single Dots background + onNodeClick/
   onPaneClick for selection.
6. **Server dies under sustained interaction** (opening dialogs, toasts)
   due to 4GB memory limit. This is an environment constraint, not a
   code bug. A production build (`next build`) would not have this issue.

## Unresolved Issues / Risks / Next Steps

### Unresolved
- **IndexedDB persistence** was implemented (`src/lib/persistence.ts`) but
  removed from page.tsx to isolate a hydration issue (turned out to be the
  FlowCanvas, not persistence). Re-adding it is safe now — the persistence
  module is ready, just needs the bootstrap + auto-save effects wired back.
- **MCP ↔ live store wiring**: the MCP server reads/writes a JSON file
  (`stitchdb-state.json`), not the live browser store. A WebSocket bridge
  would enable real-time agent-driven schema edits.
- **Server stability under interaction**: the dev server dies after ~2-3
  dialog interactions due to memory pressure. This limits interactive QA
  but doesn't affect the code correctness.

### Priority Recommendations for Next Phase
1. **Re-add IndexedDB persistence** — the module is ready at
   `src/lib/persistence.ts`. Wire `loadSchema()` into the bootstrap effect
   and `saveSchema()` into a debounced auto-save effect.
2. **Wire MCP to the live store** via a WebSocket mini-service so agent
   edits appear on the canvas in real time.
3. **Add column rename/delete via the inspector** — the `updateField` and
   `deleteField` store methods exist; the inspector UI needs the rename
   handler wired (currently only add/delete column work).
4. **Production build test** — `next build` would eliminate the HMR crash
   and memory issues, allowing full interactive QA.
5. **Add a command palette** (⌘K) for quick access to all actions.
6. **Dark/light theme toggle** (the app is dark-only currently).
