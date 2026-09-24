# JayVis.dev frontend inventory

What exists in the live IDE, including every control and what it does. No repo paths — this document is meant to be read on its own.

## Explorer rail

One icon. Toggles Schema Explorer. Not a multi-view activity bar.

## Command strip

Left to right:

| Control | Function |
|---|---|
| JayVis.dev | Toggle Schema Explorer |
| Workspace name | Current workspace label (muted) |
| Code / Board / Both | Primary view switch |
| Find | Find in Code, or search tables on Board |
| Validate | Open Problems / validation; warning/error tone when issues exist |
| Migration | Capture baseline or open migration diff |
| SQL | Open SQL builder |
| Export | Menu below; export, copy, add table, layout, save, import, settings |
| Command | Command palette |

Shortcuts live in tooltips and the Shortcuts overlay, not on the strip.

### Export menu

Export DBML, JSON AST, SQL DDL, ERD SVG, Prisma · Copy DBML · Copy AST JSON · Add table (`T`) · Auto layout (`⌘L`) · Save (`⌘S`) · Import… · Settings · Shortcuts · Clear schema

## Schema Explorer

| Control | Function |
|---|---|
| Search icon | Toggle inline schema filter |
| Hide (×) | Collapse the explorer (`⌘B`); shown on header hover |
| Workspace + PostgreSQL 16 | Current workspace name and engine label |
| Tables n / + | List tables; + opens the Add table dialog |
| Table row | Select table and open inspector |
| Relations n | `users 1:* orders`; click selects the source table |
| Views 0 | Placeholder — empty state is “None” |
| Samples | Load ecommerce, blog, saas, auth, analytics |
| Import file… | Same import as Export → Import… |
| Diff… | Open migration |
| Settings | Theme swatches; Auto-save; Minimap; Grid; Word wrap; Line numbers; Font size; Weight |

## Stage

| Control | Function |
|---|---|
| schema.dbml × | Focus Code; × on hover in Both leaves Board |
| ER Diagram × | Focus Board; × on hover in Both leaves Code |

Code: CodeMirror DBML. Board: canvas, table cards (name · type · PK/FK), `1:*` edges, zoom / fit, ⌘F search, pane and edge menus. No floating legend or search chip.

## Table Inspector

Header **Table Inspector**; close on hover. `{name}` + Table badge. Tabs **Columns | Indexes | Relations** scroll the stacked body. Column micro-actions appear on row hover. Empty sections say **None**. Color dots, Duplicate, and Drop sit in the footer. Empty inspector: Select a table from the explorer or board.

Relationship selected: cardinality, ON DELETE / ON UPDATE, Source / Target, delete.

## Dock and status

Status: Ready · Problems · Migration · SQL on the left. Right: N tables · N relations; error/warning counts only when present; `L12 C4` when Code is visible.

## Overlays

Command palette, Add table, Problems / Validation, Migration, SQL builder, Theme picker, Shortcuts, Confirm, toaster.

## Keyboard

`⌘K` palette · `⌘B` explorer · `⌘⇧B` inspector · `⌘1` Code · `⌘2` Board · `⌘3` Both · `⌘F` find · `⌘⇧V` Problems · `⌘M` Migration · `⌘⇧S` SQL · `⌘E` export DBML · `⌘S` save · `⌘L` layout · `T` add table · `⇧?` shortcuts

## Themes

dark-plus (graphite/rust default), light-plus, dracula, one-dark, github-dark, nord, solarized-dark, monokai-pro, xcode-dark, system
