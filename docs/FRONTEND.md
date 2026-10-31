# JayVis.dev Frontend Architecture & UI Inventory

This document serves as the complete, authoritative specification of the JayVis.dev frontend interface, layout hierarchy, design system tokens, and interactive workflows.

---

## 1. Top Navigation & Command Strip

Located at the top header (`h-11`, `bg-[var(--color-bg-titlebar)]`), providing project identity, workspace/branch control, view modes, and primary actions.

| Control | Position | Description |
|---|---|---|
| **JayVis.dev** | Far Left | Brand mark with status dot; toggles the left Schema Explorer sidebar. |
| **Workspace Selector** | Left | Dropdown showing active workspace (default: `ecommerce-db`). Allows switching workspaces, inline renaming, and creating new workspaces. Auto-renames when importing external schemas. |
| **Branch Selector** | Left | Git-style branch dropdown (default: `main`). Supports creating branches and switching between isolated schema versions. |
| **View Modes** | Center | Segmented view selector: **Code** (`⌘1`), **Board** (`⌘2`), **Both** (`⌘3`). Active tab displays an accent underline. |
| **Undo / Redo** | Right Group | Bidirectional canvas and editor history (`⌘Z` / `⌘⇧Z`). Disabled when stacks are empty. |
| **Find** | Right Group | `⌘F` trigger for searching text in editor or finding tables on the visual canvas. |
| **Validate** | Right Group | Live schema health indicator opening the Problems / Validation drawer (`⌘⇧V`). Highlights errors/warnings with count badges. |
| **Migration** | Right Group | Opens schema diff and baseline migration tool (`⌘M`). |
| **SQL** | Right Group | Opens the SQL Builder sheet (`⌘⇧S`) for compiling and executing SQLite/PostgreSQL DDL. |
| **Export Menu** | Right Group | Dropdown containing export formats (`.sql`, `.sqlite.sql`, `.svg`, `.prisma`), copy actions (`Copy DBML`, `Copy AST JSON`), `Add table`, `Auto layout`, `Save`, `Import…`, `Settings`, `Shortcuts`, and `Clear schema`. |
| **Command Palette** | Far Right | Quick launcher (`⌘K`) for all studio actions, samples, and navigation. |

---

## 2. Left Panel: Schema Explorer

Collapsible left sidebar (`⌘B`, resizable 220px–360px):

* **Header**: "Schema Explorer" label with inline search toggle (`⌘F`) and collapse button.
* **Workspace & Engine Badge**: Displays active workspace name and target database engine (`SQLite` or `PostgreSQL`).
* **Files (`1/3`) Section**:
  * Displays active schema files in the current branch.
  * `+` button opens the **Workspace File Hub**.
  * Shows filename, file icon (`.dbml`, `.sql`, `.json`), active status, and inline delete for secondary files.
* **Tables (`n`) Section**:
  * Lists all tables in the AST.
  * `+` button opens **Create Table** dialog (`T`).
  * Clicking a table focuses it on the board and opens the Table Inspector.
* **Relations (`n`) Section**:
  * Lists relationships with source $\rightarrow$ target and cardinality badge (`1:*`, `1:1`, `*:*`).
  * Clicking highlights the relationship edge.
* **Enums & Table Groups**:
  * Expandable sections when enums or table groups exist in the schema.
* **Samples**:
  * One-click presets: `E-Commerce`, `Blog`, `SaaS`, `Auth`, `Analytics`.
* **Explorer Actions**:
  * Import file trigger (`.dbml`, `.sql`, `.json`, `.txt`).
  * Schema Settings: Theme switcher, Minimap, Grid, Line Numbers, Word Wrap, Font Size.

---

## 3. Editor & Multi-File Tab Bar

The Code stage contains a Monaco/CodeMirror DBML editor paired with a tab management strip:

* **Tab Bar (`h-8`, `bg-[var(--color-bg-tabbar)]`)**:
  * **File Tabs**: Displays open files with icon (`fileCode`, `database`, `json`), active accent top border (`border-t-2 border-t-[var(--color-accent-primary)]`), and close button (`×`). Double-click initiates inline rename.
  * **New Tab / Quota Button**: `+` button showing `{count}/3` quota that opens the Workspace File Hub. Displays `3/3 max` when quota is filled.
  * **Quick Actions**: Inline find (`⌘F`) and pane close triggers.
* **Editor Stage**:
  * CodeMirror 6 supporting multi-dialect switching (`DBML`, `SQL`, `JSON`) via dynamic `Compartment` reconfiguration.
  * Formatting engine (`formatCode`) supporting DBML AST serialization, SQL keyword normalization, and JSON beautification (`⌥⇧F`).
  * Live bidirectional AST synchronization (editor changes reflect on canvas; canvas drag/add/remove updates code).
  * Syntax highlighting tailored to the active theme.
  * Status bar displays current cursor line/col, detected dialect, spaces (2), and UTF-8 encoding.

---

## 4. Visual Canvas (ER Diagram Board)

Powered by `@xyflow/react` with ELK.js layout engine:

* **Table Nodes**:
  * Header with table name, engine tag, and color badge.
  * Field list showing Primary Keys (`PK`), Foreign Keys (`FK`), field name, data type, and nullability flags.
  * Expand/collapse notes and field metadata.
* **Relationship Edges (`RelationshipEdge.tsx`)**:
  * Smooth bezier curves colored by cardinality.
  * Interactive cardinality badge with popover editor: 1-click cardinality switching (`1:N`, `N:1`, `1:1`, `N:M`), direction inversion, `ON DELETE` rules (`CASCADE`, `SET NULL`, `RESTRICT`, `NO ACTION`), and edge deletion.
  * Marker indicators for source and target endpoints.
  * Click to select and inspect relationship in the Context Panel.
* **Canvas Controls**:
  * Mini-map with viewport frame.
  * Zoom in/out, fit to screen (`⇧1`), auto layout (`⌘L`).
  * Right-click context menu: Add table, Auto layout, Fit view, Export SVG.

---

## 5. Right Inspector & Context Panel

Context-sensitive drawer displaying properties for the active selection:

* **Table Selected**:
  * **Tabs**: Columns, Indexes, Relationships.
  * **Columns Tab**: Name, type dropdown, PK checkbox, Unique checkbox, Nullable checkbox, Default value, and column deletion.
  * **Indexes Tab**: Composite indexes and unique constraints.
  * **Relationships Tab**: Connected foreign keys with navigation.
  * **Actions**: Table color dot picker, Duplicate table, Drop table.
* **Relationship Selected**:
  * Source table/column and Target table/column.
  * Cardinality selector (`1:N`, `1:1`, `N:M`).
  * Referential actions (`ON DELETE`, `ON UPDATE` cascades/nullify/restrict).
  * Delete relationship button.

---

## 6. Overlays & Modals

### Workspace File Hub (`FileManagerModal.tsx`)
A focused, minimalist developer dialog (`max-w-[480px]`) for managing multi-file workspaces:
* **Header**: "Workspace Files" with clean `{n}/3 files` quota counter.
* **Underline Tabs**:
  * `New File`:
    * **File Name**: Unified input field with docked `.dbml` / `.sql` / `.json` extension pills.
    * **Starter Template**: 2x2 grid of minimal cards (*Blank*, *E-Commerce*, *SaaS & Auth*, *Content & Blog*) styled with `var(--color-selection)` on select.
    * **Footer**: Cancel and Create File (`var(--color-accent-primary)`).
  * `All Files ({n})`:
    * List of current branch files with line count, active badge, inline rename, delete, and open actions.
  * `Import`:
    * Dashed drag-and-drop zone supporting `.dbml`, `.sql` (DDL), `.json` (AST), and `.txt`.

### SQL Builder & Studio Execution Center (`SqlBuilderPanel.tsx`)
Slide-over sheet with 5 tabs for compiling, seeding, querying, and inspecting databases:
* **Engine Switcher**: Toggle between `SQLite` (local server dev.db) and `PostgreSQL` (Neon connection).
* **Tabs**:
  * `SQL DDL`: Syntax-highlighted DDL script generated directly from AST (`PRAGMA foreign_keys = ON;`).
  * `Mock Seed`: Constraint-aware mock data generator synthesizing parent-child consistent records (5, 10, or 25 rows/table). Supports 1-click database insertion into SQLite/Postgres.
  * `Query Runner`: Interactive tabular SQL executor with quick query chips, timing metrics (ms), row counts, and CSV export.
  * `Build Results`: Per-statement status (success/failure, error messages, rows affected).
  * `DB Tables`: Live database inspection listing verified tables.
* **Actions**: Build Tables (executes SQL in a transaction), Seed Database, Run Query, Copy SQL, Download `.sql`, Check DB, Drop All.

### Create Table (`AddTableDialog.tsx`)
Modal (`T`) to scaffold a new table:
* Table name and schema input.
* Column list builder: name, type selector, Primary Key, Unique, Nullable checkboxes.
* Synchronizes instantly to AST, canvas, and DBML editor.

### Problems & Validation (`ValidationPanel.tsx`)
Drawer (`⌘⇧V`) auditing schema structure:
* Real-time checks for orphaned foreign keys, duplicate table/column names, missing primary keys, reserved keywords, and invalid references.
* Clicking any issue jumps directly to the affected table or edge.

### Migration Diff (`MigrationPanel.tsx`)
Compares current AST against a captured baseline snapshot:
* Generates SQL `UP` and `DOWN` migration statements.
* Recaptures baseline or exports migration scripts.

---

## 7. Design System & CSS Token Architecture

All UI components MUST adhere strictly to the central tokens defined in `src/app/globals.css`. Ad-hoc variables or invented color tokens are prohibited.

### Background Tokens
* `--color-bg-app` (`#141414` default): Main application background, canvas backdrop, and secondary card bodies.
* `--color-bg-panel` (`#1c1c1c` default): Sidebar, modal cards, inspector panel, and dropdown containers.
* `--color-bg-tertiary` (`#2a2a2a` default): Hover states, segmented active buttons, and tab backgrounds.
* `--color-bg-editor` (`#141414` default): CodeMirror editor background.
* `--color-bg-titlebar` (`#141414` default): Top navigation toolbar.
* `--color-bg-tabbar` (`#1c1c1c` default): Editor tab bar container.

### Border & Selection Tokens
* `--color-border-subtle` (`#2a2a2a` default): 1px structural dividing lines.
* `--color-border-default` (`#3a3a3a` default): Emphasized boundaries and interactive borders.
* `--color-selection` (`#3d2a1e` default): Active row highlights and selected card wash.

### Accent & Text Tokens
* `--color-accent-primary` (`#c45c26` rust default; adapts per theme): Primary actions, active indicators, and focus rings.
* `--color-accent-hover` (`#a34b1e` default): Primary button hover state.
* `--color-text-primary` (`#e6e1db` default): High-contrast primary labels and body copy.
* `--color-text-secondary` (`#c4b8ad` default): Supporting text and section labels.
* `--color-text-muted` (`#8a8a8a` default): Subtitles, line counts, shortcuts, and placeholder text.

### Dialog & Overlay Rules
* All dialog overlays MUST include `bg-black/60` and `backdrop-blur-sm` to prevent background bleed-through.
* Dialog content containers MUST use `bg-[var(--color-bg-panel)]` and `border-[var(--color-border-subtle)]`.

---

## 8. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Open Command Palette |
| `⌘1` | Focus Code editor |
| `⌘2` | Focus ER Diagram board |
| `⌘3` | Split view (Both Code & Board) |
| `⌘B` | Toggle Schema Explorer sidebar |
| `⌘⇧B` | Toggle Table Inspector panel |
| `⌘F` | Find in editor / Search tables on board |
| `⌥⇧F` / `Alt+Shift+F` | Format active document (DBML, SQL, JSON) |
| `⌘Z` | Undo |
| `⌘⇧Z` | Redo |
| `⌘S` | Save workspace snapshot |
| `⌘L` | Auto layout canvas nodes (ELK) |
| `⌘⇧V` | Open Problems / Validation drawer |
| `⌘M` | Open Migration Diff panel |
| `⌘⇧S` | Open SQL Builder panel |
| `⌘E` | Quick export DBML |
| `T` | Open Create Table dialog |
| `⇧?` | Open Keyboard Shortcuts overlay |
