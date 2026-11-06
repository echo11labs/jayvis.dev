# JayVis Video Recording Guide & Screen Studio Script

> **A step-by-step production script for recording crisp, high-conversion product walkthrough videos for `jayvis.dev` using Recordly / Screen Studio.**

---

## 🎬 Pre-Recording Setup & Environment Checklist

### 1. Display & Browser Configuration
* **Resolution**: Record at **1920 × 1080 (1080p)** or **2560 × 1440 (1440p)** at **60 FPS**.
* **Browser**: Chrome / Brave / Arc in a clean incognito or dedicated recording profile (no cluttered extensions, bookmarks bar hidden with `⌘⇧B`).
* **Browser Zoom**: Set browser zoom to **100%** or **110%** so code text and table headers are punchy and legible.
* **Cursor**: Enable smooth cursor spring tracking in Recordly if available.
* **Local Server**: Ensure your development server is running locally:
  ```bash
  npm run dev
  ```
  Open `http://localhost:3000/app?sample=ecommerce` in one tab and `http://localhost:3000/app` (clean) in another tab.

---

## 📹 Video 1: The Master 30-Second Hero Walkthrough
* **Target Duration**: 25–35 seconds
* **Goal**: Show the entire value proposition in one continuous, seamless flow: **Declarative Code $\rightarrow$ Automatic Layout $\rightarrow$ Visual Relationship Edit $\rightarrow$ Instant Multi-Dialect Export**.

### Step-by-Step Script:

| Timestamp | Screen Action | What to Type / Click | Visual Cue / Focus |
|---|---|---|---|
| **0:00 – 0:05** | Start on the clean Split Stage (`http://localhost:3000/app`). The Code editor is on the left, empty Canvas on the right. | Click in the CodeMirror editor and paste or type: <br>`Table users { id integer [pk] email varchar [unique] }` | Watch the table node instantly pop into the canvas on the right in `< 10ms`. |
| **0:05 – 0:12** | Hit Enter and paste the orders table: | ```dbml
Table orders {
  id integer [pk]
  user_id integer
  total decimal
  status varchar
}
Ref: orders.user_id > users.id
``` | The second table renders and an orthogonal relationship line connects `orders.user_id` to `users.id` automatically. |
| **0:12 – 0:18** | Move cursor to the Canvas. Drag the `orders` table smoothly to the right. | Click on the relationship handle connecting `orders` and `users`. In the Inspector panel, toggle **ON DELETE CASCADE**. | Notice the code editor on the left automatically updates to `[delete: cascade]` in real time without losing cursor position. |
| **0:18 – 0:24** | Click the **Migration** (`⌘M`) button in the top command strip. | The Migration Sheet slides in, showing the automated schema diff and green verified `ALTER TABLE` DDL. | Highlight the zero-risk safe script. |
| **0:24 – 0:30** | Click **SQL** in the command strip, switch the dialect dropdown to **PostgreSQL**, then **Prisma ORM**, then copy. | Close sheet and pan smoothly across the canvas. End clip. | Pure speed, zero server lag, 100% in-browser memory. |

---

## 📹 Video 2: Two-Way Reactive Synchrony (Code $\leftrightarrow$ Canvas)
* **Target Duration**: 15–20 seconds
* **Goal**: Prove that Jayvis is not a one-way generator, but a true bidirectional IDE.

### Step-by-Step Script:
1. **[0:00 – 0:06] Start on the Canvas with an existing table**:
   - Focus on `users` table.
   - In the editor on the left, add a new field: `avatar_url varchar`.
   - Show the field appear inside the table card on the canvas with zero flicker.
2. **[0:06 – 0:13] Drag relationship on Canvas**:
   - Create a new table on the canvas or click the `+` button on `users`.
   - Drag a connection wire from `orders.user_id` to `users.id`.
   - Release the mouse.
3. **[0:13 – 0:20] Editor updates automatically**:
   - The camera pans slightly to the code editor where `Ref: orders.user_id > users.id` has been cleanly appended with proper indentation.

---

## 📹 Video 3: In-Browser WASM Database & Relational Mock Seeding
* **Target Duration**: 20–25 seconds
* **Goal**: Show the client-side PGlite WASM execution sandbox and instant synthetic data generation with zero network requests.

### Step-by-Step Script:
1. **[0:00 – 0:08] Open DevTools Network Tab (Optional or Picture-in-Picture)**:
   - Show the Network tab filtered to Fetch/XHR showing **0 requests**.
2. **[0:08 – 0:15] Click "Mock Data" / "Seed"**:
   - Click the Seed Mock Data button in the playground toolbar.
   - Select **25 Rows** across all tables.
   - Click **Generate & Execute**.
3. **[0:15 – 0:25] Show Data Grid**:
   - The data table drawer slides open with real mock rows: realistic names, valid emails, and foreign keys strictly matching existing parent IDs.
   - Run a quick `SELECT * FROM orders JOIN users ON orders.user_id = users.id;` query.
   - Results return in **< 4ms** directly from client RAM.

---

## 📹 Video 4: Multi-Dialect Export & Zero-Lock-In
* **Target Duration**: 15 seconds
* **Goal**: Show that one schema compiles to PostgreSQL, SQLite, Prisma ORM, and Supabase instantly.

### Step-by-Step Script:
1. **[0:00 – 0:05]**: Open the SQL Builder sheet from the command strip (`⌘⇧S`).
2. **[0:05 – 0:10]**: Click the dialect pill:
   - Click **PostgreSQL** $\rightarrow$ shows `UUID`, `gen_random_uuid()`, `TIMESTAMPTZ`.
   - Click **SQLite** $\rightarrow$ shows `PRAGMA foreign_keys = ON`, `AUTOINCREMENT`.
   - Click **Prisma ORM** $\rightarrow$ shows `@relation(...)` and `@@map("orders")`.
3. **[0:10 – 0:15]**: Click the **Copy** button (green checkmark animates). Close the modal.

---

## 📋 Copy-Paste Code Snippet to Use During Recording

Keep this snippet in your clipboard so you can paste it during recording without typing errors:

```dbml
Table users {
  id integer [pk, increment]
  email varchar [unique, not null]
  full_name varchar
  created_at timestamptz [default: 'now()']
}

Table products {
  id integer [pk, increment]
  title varchar [not null]
  price_cents integer [not null]
  in_stock boolean [default: true]
}

Table orders {
  id integer [pk, increment]
  user_id integer [not null]
  total_cents integer [not null]
  status varchar [default: 'pending']
  placed_at timestamptz [default: 'now()']
}

Table order_items {
  id integer [pk, increment]
  order_id integer [not null]
  product_id integer [not null]
  quantity integer [not null, default: 1]
}

Ref: orders.user_id > users.id [delete: cascade]
Ref: order_items.order_id > orders.id [delete: cascade]
Ref: order_items.product_id > products.id
```

---

## ⚙️ Post-Recording Export Recommendations (for Recordly)

1. **Format**: MP4 (H.264) or WebM.
2. **Resolution**: 1080p (1920 × 1080) at 60 FPS.
3. **Playback Speed**: 1.0x (or 1.1x if typing takes a little longer).
4. **Audio**: No audio needed (silent auto-looping preview) or brief background lo-fi synth if using on YouTube/X.
5. **Saved File Destination**:
   Place exported videos in:
   ```
   public/videos/jayvis-hero-walkthrough.mp4
   public/videos/jayvis-two-way-sync.mp4
   public/videos/jayvis-wasm-seeder.mp4
   ```

