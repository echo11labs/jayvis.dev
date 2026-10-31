# JayVis (`jayvis.dev`)

> **Production-Grade, Two-Way Reactive Database Design Studio**  
> Visual ERD meets live DBML code with zero-latency synchronization, multi-file workspaces, automated migration diffs, and local-first privacy.

---

## ⚡ Quick Start (Local & Self-Hosted)

JayVis is built **local-first**. You can clone and run it locally on your computer with zero configuration, no external database, and no API keys required.

```bash
# 1. Clone repository
git clone https://github.com/devendrashahi/jayvis.dev.git
cd jayvis.dev

# 2. Install dependencies (automatically generates Prisma client)
npm install

# 3. Start local development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) for the Landing Page or [http://localhost:3000/app](http://localhost:3000/app) to dive straight into the Studio IDE.

---

## 🏗️ System Architecture

JayVis implements a dual-tier storage and execution architecture designed for developer privacy and high flexibility:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER                                 │
│  ┌───────────────────────┐              ┌────────────────────────────────┐  │
│  │   CodeMirror 6 DBML   │ ◄──────────► │       React Flow 12 ERD        │  │
│  │        Editor         │              │          Interactive           │  │
│  └──────────┬────────────┘              └────────────────┬───────────────┘  │
│             │                                            │                  │
│             ▼                                            ▼                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Zustand AST Store                             │  │
│  │                     (Single Source of Truth)                          │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │                                       │
│          ┌──────────────────────────┴──────────────────────────┐            │
│          ▼                                                     ▼            │
│  ┌────────────────────────────────┐                 ┌────────────────────┐  │
│  │    Local IndexedDB Storage     │                 │ localStorage Sync  │  │
│  │      (Full workspace AST)      │                 │ (Instant snapshot) │  │
│  └────────────────────────────────┘                 └────────────────────┘  │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ (When Cloud Auth Enabled)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NEXT.JS BACKEND                                │
│  ┌────────────────────────────────┐                 ┌────────────────────┐  │
│  │      Clerk Authentication      │                 │  Cloud Sync API    │  │
│  │       (Free / Pro Tiers)       │                 │ (/api/cloud/sync)  │  │
│  └────────────────┬───────────────┘                 └─────────┬──────────┘  │
│                   │                                           │             │
│                   └─────────────────────┬─────────────────────┘             │
│                                         ▼                                   │
│                        ┌─────────────────────────────────┐                  │
│                        │       Prisma ORM Client         │                  │
│                        │ (SQLite dev / Postgres prod)    │                  │
│                        └────────────────┬────────────────┘                  │
│                                         │                                   │
│                        ┌────────────────▼────────────────┐                  │
│                        │  mini-services/dbml-parser      │                  │
│                        │  (Native AST Engine :3031)      │                  │
│                        └─────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1. Local-First Engine (Default)
- **Zero-Latency Storage**: Workspace schemas and files are dual-persisted to browser **IndexedDB** and mirrored to synchronous **localStorage** snapshots.
- **Offline Reliability**: Works seamlessly on planes, trains, and offline environments. Browser reloads and accidental tab closes never lose unsaved changes.
- **Privacy Guaranteed**: Schema text never leaves your machine unless you explicitly authenticate and sync with Cloud Storage.

### 2. Cloud Storage & Team Sync (Optional)
- Connect multi-device cloud storage by configuring **Clerk** and a PostgreSQL database in `.env.local`.
- Automatic background sync on manual save (`Cmd+S`).
- Quota management and branch collaboration across team members.

---

## 📦 Storage Tiers & Quotas

| Tier | File Limit | Storage Target | Requires Auth? |
| :--- | :--- | :--- | :--- |
| **Local Mode** | **10 files** | Browser IndexedDB + local SQLite | No (Default) |
| **Cloud Free** | **15 files** | Cloud PostgreSQL / Prisma | Yes (Clerk) |
| **Cloud Pro** | **Unlimited** | Cloud PostgreSQL / Prisma | Yes (Clerk Pro) |

---

## ⚙️ Environment Variables

Create `.env.local` to override defaults (see `.env.example`):

```bash
# --- Local Mode (Default) ---
DATABASE_URL="file:./dev.db"
DBML_PARSER_URL="http://127.0.0.1:3031"
DBML_PARSER_TIMEOUT_MS=5000

# --- Optional Cloud Sync (Clerk & Hosted Postgres) ---
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
POSTGRES_URL=postgresql://user:pass@host:5432/jayvis?sslmode=require
```

---

## 🛠️ Development & Quality Commands

```bash
# Start dev servers (Parser on :3031 + Next.js on :3000)
npm run dev

# Run full quality check (ESLint + TypeScript + Vitest)
npm run check

# Run tests with Vitest
npm run test

# Run build verification
npm run build

# Start production server
npm run start
```

---

## 🚀 Export & Migration Dialects

JayVis allows 1-click downloads directly from the studio toolbar:
- **DBML**: Standard Database Markup Language document.
- **PostgreSQL**: Production-ready DDL schema with foreign key constraints and indexes.
- **SQLite**: Portable DDL schema script with foreign key pragmas.
- **Prisma**: Native `schema.prisma` definitions.
- **SVG / PNG**: High-resolution vector diagrams for documentation and pitch decks.
- **AST JSON**: Raw structured AST for programmatic toolchains and CI pipelines.

---

## 📄 License

MIT © [Devendra Shahi](https://github.com/devendrashahi)
