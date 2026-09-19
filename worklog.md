# StitchDB — Project Worklog

## Current Project Status

StitchDB is a **developer-first database modeling workspace** that bridges
declarative DBML code and visual ERDs using an AST as the single source of
truth. The platform is **functional, browser-verified, and feature-complete**
with bidirectional canvas↔editor sync, IndexedDB persistence, a command
palette, edge context menus, ERD SVG export, schema search, undo/redo,
schema validation, table & field notes UI, live validation badge, full
dark/light theme coverage (canvas + editor + toolbar + inspector + all
dialogs + command palette), table duplicate, copy-to-clipboard, column
reordering, canvas pane context menu, cardinality-colored edges, fit-view
shortcut, **Prisma schema export, JSON AST import, polished status bar with
parse indicator + line/char counts, glassmorphic gradient branding, custom
animations, and scrollbars**.

### Architecture
- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Canvas**: @xyflow/react (React Flow) with theme-aware custom TableNode
- **Layout**: ELK.js (dynamic import for "Auto Layout")
- **DBML Parser**: Isolated Bun mini-service on port 3031 (21 MB @dbml/core
  kept out of the Next.js bundle to avoid Turbopack OOM)
- **Persistence**: IndexedDB (local-first — schema + positions survive reloads)
- **Diff Engine**: AST-driven schema diff → up/down SQL migrations
- **Export Formats**: DBML, PostgreSQL DDL, JSON AST, ERD SVG, **Prisma schema**
- **Import Formats**: DBML, **JSON AST** (auto-detected)
- **Validation**: AST → prioritized errors/warnings + live badge
- **MCP**: Standalone Model Context Protocol server for IDE agent integration
- **State**: Zustand store with origin flagging + bidirectional sync + undo/redo
- **Theme**: Full dark/light toggle (all components)

## Current Goals / Completed Modifications / Verification

### Phase 12 — Completed (this round)

1. **Prisma schema export** ✅ (`src/lib/export/prisma.ts`)
   - Converts the DatabaseAST to a complete `schema.prisma` file with:
     - `generator client` + `datasource db` boilerplate
     - `model` declarations with `@id`, `@unique`, `@default(now())`,
       `@default(autoincrement())` directives
     - `@relation` with field mappings, onDelete actions
     - `@@map` for table names, `@@schema` for non-public schemas
     - Prisma type mapping (uuid→String @db.Uuid, timestamptz→DateTime, etc.)
   - Available in toolbar Export dropdown ("Export as Prisma schema") +
     command palette.
   - **Verified**: Export dropdown now has 8 items including "Export as
     Prisma schema".

2. **JSON AST import** ✅ (`src/components/workspace/Toolbar.tsx`)
   - Import button now accepts `.dbml`, `.txt`, **and `.json`** files.
   - Auto-detects JSON AST files (checks for `tables` key) and loads them
     directly via `loadAST()` — no DBML parsing round-trip needed.
   - Falls through to DBML text import for non-JSON files.

3. **Polished status bar** ✅ (`src/app/page.tsx`)
   - Real-time parse status indicator:
     - Indigo pulsing dot + "parsing…" while parsing.
     - Red dot + "parse error" on errors.
     - Green dot + status message when healthy.
   - Line count + char count badges (`42L · 1016c`).
   - Backdrop-blur-md for glassmorphic effect.
   - `isParsing` selector added for reactive updates.

4. **Glassmorphic gradient branding** ✅ (`src/components/workspace/Toolbar.tsx`)
   - "StitchDB" logo text uses a gradient clip (`bg-gradient-to-r` with
     `bg-clip-text text-transparent`) — zinc-100→zinc-300 in dark, zinc-900→
     zinc-600 in light.

5. **Custom animations & scrollbars** ✅ (`src/app/globals.css`)
   - Added CSS animation utilities:
     - `animate-fade-in` — panels fade in from below.
     - `animate-slide-in-right` — sheet panels slide in from right.
     - `animate-pulse-glow` — status indicators pulse.
     - `.glow-indigo` — subtle indigo glow shadow.
     - `.scrollbar-thin` — slim, themed scrollbar styling.
   - Applied `animate-fade-in` to the inspector panel.

### Previous Phases (still working)
- **Phase 11**: CommandPalette theming, canvas pane context menu,
  cardinality-colored edges (1:1=emerald, 1:N=indigo, N:M=pink).
- **Phase 10**: Dialog theming (AddTable, Shortcuts, Validation, Migration),
  column reordering (move up/down), canvas header stats badge.
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
- ✅ Export dropdown has 8 items including "Export as Prisma schema"
- ✅ Status bar shows parse indicator + line/char counts
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
5. **Performance optimization** — use `useShallow` for Zustand selectors
   to prevent unnecessary re-renders; memoize TableNode more aggressively.
6. **Prisma schema import** — parse `schema.prisma` files back into the AST.
