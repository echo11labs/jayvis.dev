# JayVis.dev — build plan

Product: JayVis.dev (repo folder JayVis). AST is source of truth.

## Layers

| # | Focus | Key paths |
|---|--------|-----------|
| 0 | Types | `src/types/ast.ts` |
| 1 | Store | `src/store/diagram-store.ts` |
| 2 | Parse/serialize | `src/lib/parser/dbml.ts`, `mini-services/dbml-parser`, `src/app/api/parse` |
| 3 | Sync | `src/app/page.tsx` (`sourceOrigin`) |
| 4 | Canvas | `src/components/canvas/*` |
| 5 | CRUD UI | Inspector, ContextPanel, AddTableDialog |
| 6 | Persist | `src/lib/persistence.ts` |
| 7 | Validate | `src/lib/validation/*` |
| 8 | Diff | `src/lib/diff/schema-diff.ts`, MigrationPanel |
| 9 | Export | `src/lib/export/*` |
| 10 | SQL Builder | `ddl-sqlite.ts`, `api/build-sql`, SqlBuilderPanel |
| 11 | Chrome | Schema Studio: command strip, catalog, Code/Board/Both stage, inspector, footer |
| 12 | MCP | `src/mcp/server.ts` → live WS later |

## Session rule

One layer or one feature slice. Done bar: contract → core → wire → sync → persist/export.

## Now

1. Land shell/token WIP ✅
2. Delete `rewrite-*.js`, `migrate-css.js` ✅
3. Layer 0–2 audit ✅
4. Layer 3–4 sync/canvas ✅
5. Robustness phases 1–5 ✅
   - Node parser + portable SQLite/dev scripts
   - `SyncStatus` + versioned workspace drafts
   - Atomic `replaceWorkspace`, confirmable destructive actions, selection-safe undo
   - Truthful status/settings/shortcuts
   - SQL Builder typed errors + protected tables
6. Verification gate: `npm run check` (lint, tsc, 20 vitest tests) ✅
7. Layer 5 Inspector / Context / AddTable ✅
   - Unique table/column name guards
   - Add-table placement, unique flag, sync gate
   - Inspector field-note layout, default value, confirms
8. Layer 6 persist is already versioned ✅
9. Layer 7 validation polish ✅
   - Empty tables, missing index columns, FK type/unique targets, duplicate refs, snake_case/reserved names
   - `summarizeValidation` + sorted issues + table markers
   - Panel/badge/footer wired to real counts; issue click selects table or edge
10. Layer 8 diff/migrations polish ✅
    - Indexes + FK diffs, PostgreSQL UP/DOWN (no SQLite rebuild)
    - Recapture baseline, save SQL, issue click selects table/edge
11. Layer 9 export polish ✅
    - Unified `exportWorkspace` (DBML/JSON/SQL/SVG/Prisma)
    - PostgreSQL DDL quoting, Prisma models/relations/indexes, SVG XML escape
12. Layer 11 chrome leftovers ✅
    - Token menus/overlays, all theme swatches, palette opens picker + JSON export
    - ThemeToggle label fits; ⌘⇧T no longer stolen by create-table
13. Editor: CodeMirror 6 StreamLanguage (highlight, complete, lint, JetBrains Mono)
14. Layer 11 Schema Studio chrome (not a VS Code clone)
    - Command strip: JayVis · Code | Board | Both · verbs · ⌘K
    - Catalog: tables + relations; samples/import at the bottom
    - Stage: one document, three faces (no fake file tabs)
    - Inspector: selection only; empty = “Select a table”
    - Footer: tables · parse · issues (opens validation). Graphite unless problems
    - Marks: local SVG in `src/lib/ui/marks.tsx` — no icon webfont
    - Tokens: graphite `#141414` / `#1c1c1c` / `#2a2a2a`, rust `#c45c26`
15. Next: Layer 12 MCP last
