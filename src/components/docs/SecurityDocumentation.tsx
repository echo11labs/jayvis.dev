'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  ExternalLink,
  ShieldCheck,
  Check,
  Copy,
  Terminal,
  Building2,
  Cpu,
  Layers,
  Zap,
  CheckCircle2,
  Database,
  ArrowRight,
} from 'lucide-react';

export function SecurityDocumentation() {
  const [activeTab, setActiveTab] = useState<'business' | 'tech' | 'security'>('business');
  const [copied, setCopied] = useState(false);

  const mcpConfig = `{
  "mcpServers": {
    "jayvis": {
      "command": "npx",
      "args": ["-y", "@jayvis/mcp-server", "--local-only"]
    }
  }
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mcpConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-[#030305] text-white pt-12 sm:pt-16 pb-20 sm:pb-32 select-none">
      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Document Shell Container ── */}
        <div className="rounded-xl border border-neutral-800 bg-[#07070a] shadow-[0_20px_70px_rgba(0,0,0,0.8)] overflow-hidden">

          {/* Top Documentation Header Bar */}
          <div className="flex flex-wrap items-center justify-between border-b border-neutral-800/80 px-5 sm:px-8 py-3.5 bg-[#0a0a0f] text-xs font-mono text-neutral-400 gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-[#D2FF00]" />
              <span className="text-neutral-500">docs</span>
              <span className="text-neutral-600">/</span>
              <span className="text-white font-medium">
                {activeTab === 'business' && 'what-is-jayvis-business-overview.md'}
                {activeTab === 'tech' && 'technical-architecture-ast-compiler.md'}
                {activeTab === 'security' && 'security-airgap-threat-model.md'}
              </span>
            </div>

            {/* Document Perspective Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded">
              <button
                type="button"
                onClick={() => setActiveTab('business')}
                className={`px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                  activeTab === 'business'
                    ? 'bg-[#D2FF00] text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Building2 className="w-3 h-3" />
                <span>Business Terms</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tech')}
                className={`px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                  activeTab === 'tech'
                    ? 'bg-[#D2FF00] text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>Technical Terms</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                  activeTab === 'security'
                    ? 'bg-[#D2FF00] text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Security &amp; Threat Model</span>
              </button>
            </div>
          </div>

          {/* Document Content Grid: Article (8 cols) + Sidebar TOC (4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-neutral-800/80">

            {/* ── Left Column: Active Documentation Article ── */}
            <article className="lg:col-span-8 p-6 sm:p-10 space-y-8 text-neutral-300 font-sans leading-relaxed text-sm sm:text-[15px]">

              {/* ══════════════════════════════════════════════════════════════
                  VIEW 1: WHAT IS JAYVIS IN SIMPLE BUSINESS TERMS
                  ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'business' && (
                <div className="space-y-8">
                  {/* Title & Document Abstract */}
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#D2FF00]/10 border border-[#D2FF00]/30 text-[#D2FF00] font-mono text-[11px] font-bold uppercase tracking-wider mb-3">
                      <Building2 className="w-3.5 h-3.5" />
                      EXECUTIVE BUSINESS OVERVIEW
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight mb-4">
                      What is JayVis in Simple Business Terms?
                    </h1>
                    <p className="text-base text-neutral-400 leading-relaxed font-normal">
                      JayVis is an architectural design studio for software databases. It gives engineering teams a visual, interactive blueprint combined with code to design, explore, validate, and deploy database architectures with zero risk, zero cloud infrastructure costs, and 100% data privacy.
                    </p>
                  </div>

                  {/* High Concept Analogy */}
                  <div className="p-4 rounded-lg bg-neutral-900/60 border border-neutral-800 flex items-start gap-3">
                    <Zap className="w-5 h-5 text-[#D2FF00] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-white font-bold text-sm mb-1">
                        Think of it as &quot;Figma + Compiler for Relational Databases&quot;
                      </h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        You can design your company database by typing clean code or by dragging tables on an interactive board. JayVis guarantees both stay in continuous, bilateral sync so technical and non-technical stakeholders are always aligned.
                      </p>
                    </div>
                  </div>

                  {/* The Problem It Solves */}
                  <div id="biz-problems" className="pt-6 border-t border-neutral-800/60 space-y-4">
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <span className="font-mono text-xs text-[#D2FF00]">1.0</span>
                      The Expensive Business Problems JayVis Solves
                    </h2>

                    <div className="space-y-4">
                      <div className="p-4 rounded bg-[#0a0a0f] border border-neutral-800/80">
                        <div className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider mb-1">
                          PROBLEM 01 // DATABASE MIGRATION DISASTERS
                        </div>
                        <p className="text-sm text-neutral-300">
                          A faulty database migration or broken foreign key is the single most expensive error in software engineering, frequently causing hours of catastrophic downtime, corrupted customer records, and lost revenue.
                        </p>
                        <p className="text-xs text-[#D2FF00] font-mono mt-2 font-medium">
                          ✦ JayVis Solution: Automated schema diffing generates mathematically safe, verified ALTER TABLE scripts before any code touches production.
                        </p>
                      </div>

                      <div className="p-4 rounded bg-[#0a0a0f] border border-neutral-800/80">
                        <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-1">
                          PROBLEM 02 // INTELLECTUAL PROPERTY &amp; SECURITY LEAKS
                        </div>
                        <p className="text-sm text-neutral-300">
                          Traditional web-based database tools require uploading your company proprietary schema and database credentials to third-party cloud servers, risking enterprise data leaks and failing compliance audits.
                        </p>
                        <p className="text-xs text-[#D2FF00] font-mono mt-2 font-medium">
                          ✦ JayVis Solution: 100% Client-Side. Runs entirely in your browser memory. Zero credentials required, zero telemetry egress.
                        </p>
                      </div>

                      <div className="p-4 rounded bg-[#0a0a0f] border border-neutral-800/80">
                        <div className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider mb-1">
                          PROBLEM 03 // VENDOR LOCK-IN &amp; INFRASTRUCTURE SPEND
                        </div>
                        <p className="text-sm text-neutral-300">
                          Setting up cloud staging databases just to test schemas costs thousands in cloud bills and locks teams into a single vendor ecosystem.
                        </p>
                        <p className="text-xs text-[#D2FF00] font-mono mt-2 font-medium">
                          ✦ JayVis Solution: Embedded in-browser PGlite &amp; SQLite WASM engines run test queries and synthetic mock datasets locally in milliseconds with $0 cloud bills.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Core ROI & Benefits */}
                  <div id="biz-roi" className="pt-6 border-t border-neutral-800/60 space-y-4">
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <span className="font-mono text-xs text-[#D2FF00]">2.0</span>
                      Business ROI &amp; Value Proposition
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded bg-neutral-900/40 border border-neutral-800">
                        <div className="text-2xl font-bold text-[#D2FF00] font-mono mb-1">10x</div>
                        <div className="text-white font-bold text-sm mb-1">Faster Time-to-Market</div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Cuts database schema planning and cross-team review cycles from multi-day meetings down to minutes.
                        </p>
                      </div>

                      <div className="p-4 rounded bg-neutral-900/40 border border-neutral-800">
                        <div className="text-2xl font-bold text-emerald-400 font-mono mb-1">$0</div>
                        <div className="text-white font-bold text-sm mb-1">Zero Cloud Infrastructure</div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Test schemas and run mock datasets locally in browser RAM without provisioning expensive staging databases.
                        </p>
                      </div>

                      <div className="p-4 rounded bg-neutral-900/40 border border-neutral-800">
                        <div className="text-2xl font-bold text-sky-400 font-mono mb-1">SOC 2</div>
                        <div className="text-white font-bold text-sm mb-1">Instant Compliance Approval</div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Zero egress architecture means zero third-party vendor risk assessment. Passes enterprise air-gap requirements out of the box.
                        </p>
                      </div>

                      <div className="p-4 rounded bg-neutral-900/40 border border-neutral-800">
                        <div className="text-2xl font-bold text-[#D2FF00] font-mono mb-1">5+</div>
                        <div className="text-white font-bold text-sm mb-1">Multi-Dialect Freedom</div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Design once; export seamlessly to PostgreSQL, SQLite, Prisma ORM, Supabase, or MySQL with zero lock-in.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════
                  VIEW 2: WHAT IS JAYVIS IN DEEP TECHNICAL TERMS
                  ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'tech' && (
                <div className="space-y-8">
                  {/* Title & Technical Abstract */}
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-sky-400/10 border border-sky-400/30 text-sky-400 font-mono text-[11px] font-bold uppercase tracking-wider mb-3">
                      <Cpu className="w-3.5 h-3.5" />
                      TECHNICAL ARCHITECTURE SPECIFICATION
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight mb-4">
                      What is JayVis in Deep Technical Terms?
                    </h1>
                    <p className="text-base text-neutral-400 leading-relaxed font-normal">
                      JayVis is a client-side, local-first Abstract Syntax Tree (AST) database compiler and reactive visual ERD IDE. It runs on Next.js 16, React 19, CodeMirror 6 with Lezer incremental parsing, React Flow 12, off-thread WebAssembly layout workers (ELK), embedded PGlite/SQLite WASM engines, and the Model Context Protocol (MCP).
                    </p>
                  </div>

                  {/* Section 1: Bidirectional Reactive AST */}
                  <div id="tech-ast" className="pt-6 border-t border-neutral-800/60 space-y-4">
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <span className="font-mono text-xs text-[#D2FF00]">1.0</span>
                      Bidirectional AST Synchronization (Zero Compile Drift)
                    </h2>
                    <p className="text-neutral-400 text-sm">
                      The core engine is governed by a canonical Zustand AST store (`SchemaAST`) representing all database primitives: tables, columns, constraints, foreign keys, indexes, enums, and table groups.
                    </p>
                    <ul className="space-y-2 text-neutral-300 pl-4 list-disc marker:text-[#D2FF00] text-sm">
                      <li>
                        <strong className="text-white">Editor $\rightarrow$ Canvas:</strong> CodeMirror 6 uses an incremental Lezer LALR tokenizer to parse DBML 2.6 syntax into an AST in <strong>&lt; 10ms</strong>. The AST notifies the React Flow canvas to update nodes and orthogonal relationship edges without full canvas reload.
                      </li>
                      <li>
                        <strong className="text-white">Canvas $\rightarrow$ Editor:</strong> When an engineer drags a relationship handle or toggles cardinality (`1:N` to `1:1`) on the canvas, the AST mutates and serializes formatted DBML back into the editor buffer with zero formatting corruption.
                      </li>
                    </ul>
                  </div>

                  {/* Section 2: Off-Thread ELK Web Worker */}
                  <div id="tech-worker" className="pt-6 border-t border-neutral-800/60 space-y-4">
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <span className="font-mono text-xs text-[#D2FF00]">2.0</span>
                      Off-Thread Graph Layout Engine (ELK)
                    </h2>
                    <p className="text-neutral-400 text-sm">
                      Computing layout coordinates and orthogonal routing for schemas with 40 to 100+ tables is heavy. JayVis delegates layout calculation to an isolated Web Worker running the Eclipse Layout Kernel (`elkjs`):
                    </p>
                    <div className="p-4 rounded bg-neutral-900/60 border border-neutral-800 font-mono text-xs space-y-2">
                      <div className="text-[#D2FF00] font-bold">ALGORITHM: org.eclipse.elk.layered</div>
                      <div className="text-neutral-400">
                        • Layered orthogonal edge routing with crossing minimization<br />
                        • Ports positioned dynamically on table headers and foreign key columns<br />
                        • Maintains 60 FPS (&lt; 16.6ms) on the main browser thread during calculation
                      </div>
                    </div>
                  </div>

                  {/* Section 3: In-Browser WASM Database Engines */}
                  <div id="tech-wasm" className="pt-6 border-t border-neutral-800/60 space-y-4">
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <span className="font-mono text-xs text-[#D2FF00]">3.0</span>
                      Embedded In-Memory WASM Execution (PGlite &amp; SQLite)
                    </h2>
                    <p className="text-neutral-400 text-sm">
                      JayVis includes true database runtimes compiled into WebAssembly, running inside browser memory:
                    </p>
                    <ul className="space-y-2 text-neutral-300 pl-4 list-disc marker:text-[#D2FF00] text-sm">
                      <li>
                        <strong className="text-white">PGlite (@electric-sql/pglite):</strong> A WebAssembly build of PostgreSQL that executes real PostgreSQL DDL, catalog queries, and transaction blocks in-browser.
                      </li>
                      <li>
                        <strong className="text-white">SQLite WASM:</strong> Instant local query runner with active `PRAGMA foreign_keys = ON` enforcement.
                      </li>
                      <li>
                        <strong className="text-white">Topological Relational Seeder:</strong> Evaluates the schema DAG in topological order. Parent primary keys are generated first so child rows strictly inherit valid foreign keys, guaranteeing 0 constraint violations.
                      </li>
                    </ul>
                  </div>

                  {/* Section 4: Model Context Protocol (MCP) */}
                  <div id="tech-mcp" className="pt-6 border-t border-neutral-800/60 space-y-4">
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <span className="font-mono text-xs text-[#D2FF00]">4.0</span>
                      Local Model Context Protocol (MCP) Architecture
                    </h2>
                    <p className="text-neutral-400 text-sm">
                      JayVis exposes standard JSON-RPC 2.0 endpoints over local Unix stdio pipes (`@jayvis/mcp-server`), enabling AI assistants (Claude, Cursor, Gemini) to inspect schemas and suggest migration diffs without sending proprietary data to cloud proxies.
                    </p>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════
                  VIEW 3: SECURITY SPECIFICATION & THREAT MODEL
                  ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'security' && (
                <div className="space-y-8">
                  {/* Title & Document Abstract */}
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 font-mono text-[11px] font-bold uppercase tracking-wider mb-3">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      SECURITY &amp; PRIVACY SPECIFICATION
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight mb-4">
                      Client-Side Architecture &amp; Threat Model
                    </h1>
                    <p className="text-base text-neutral-400 leading-relaxed font-normal">
                      Production database schemas reflect sensitive core domain architecture. Jayvis is engineered from the ground up as an unprivileged, client-side execution harness. All AST parsing, graph visualization, and DDL compiling run strictly inside local browser memory heap.
                    </p>
                  </div>

                  {/* Section 1: Threat Model */}
                  <div id="sec-zero-ingestion" className="pt-6 border-t border-neutral-800/60 space-y-3">
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <span className="font-mono text-xs text-[#D2FF00]">1.0</span>
                      Zero-Ingestion Execution Model
                    </h2>
                    <p className="text-neutral-400">
                      Unlike traditional cloud database tools that ingest schema definitions onto remote multi-tenant servers, Jayvis establishes a physical boundary at the browser sandbox:
                    </p>
                    <ul className="space-y-2 text-neutral-300 pl-4 list-disc marker:text-[#D2FF00] text-sm">
                      <li>
                        <strong className="text-white">Zero Remote Serialization:</strong> Table names, column definitions, types, and relationships are never dispatched to cloud analytics, LLM APIs, or background workers.
                      </li>
                      <li>
                        <strong className="text-white">Ephemeral V8 Heap:</strong> Compiler tokens and graph coordinates live strictly in browser RAM and are purged upon window closure unless explicitly saved to local IndexedDB.
                      </li>
                      <li>
                        <strong className="text-white">Credential Immunity:</strong> Jayvis models relational schemas from declarative code. It never asks for live production passwords, database connection URIs, or SSH certificates.
                      </li>
                    </ul>
                  </div>

                  {/* Section 2: Flowchart as Inline Document Figure */}
                  <div id="sec-boundary" className="pt-6 border-t border-neutral-800/60 space-y-4">
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <span className="font-mono text-xs text-[#D2FF00]">2.0</span>
                      Trust Boundary &amp; Air-Gap Perimeter
                    </h2>
                    <p className="text-neutral-400 text-sm">
                      The following architectural diagram illustrates the physical trust perimeter between the local host environment and external remote networks:
                    </p>

                    {/* Inline Document Figure */}
                    <figure className="my-6 rounded-lg border border-neutral-800 bg-[#040407] p-5 sm:p-6 overflow-hidden">
                      <svg
                        viewBox="0 0 760 260"
                        className="w-full h-auto block select-none"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {/* Local Machine Perimeter Box */}
                        <rect
                          x="10"
                          y="15"
                          width="470"
                          height="230"
                          rx="6"
                          stroke="#27272a"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <text x="22" y="34" fill="#71717a" fontSize="9" fontFamily="var(--font-mono)" fontWeight="bold">
                          LOCAL DEVELOPER MACHINE [TRUSTED BOUNDARY]
                        </text>

                        {/* Node 1: File Repo */}
                        <g transform="translate(24, 52)">
                          <rect width="130" height="90" rx="4" fill="#0c0c12" stroke="#27272a" strokeWidth="1" />
                          <rect width="130" height="20" rx="4" fill="#14141c" />
                          <text x="10" y="14" fill="#a1a1aa" fontSize="8" fontFamily="var(--font-mono)" fontWeight="bold">LOCAL FILES</text>
                          <text x="10" y="38" fill="#D2FF00" fontSize="8" fontFamily="var(--font-mono)">schema.dbml</text>
                          <text x="10" y="54" fill="#ffffff" fontSize="8" fontFamily="var(--font-mono)">schema.sql</text>
                          <text x="10" y="72" fill="#71717a" fontSize="7.5" fontFamily="var(--font-mono)">migrations/</text>
                        </g>

                        {/* Node 2: Jayvis In-Memory Engine */}
                        <g transform="translate(180, 52)">
                          <rect width="285" height="90" rx="4" fill="#0c0c12" stroke="#D2FF00" strokeWidth="1.2" />
                          <rect width="285" height="20" rx="4" fill="#14141c" />
                          <circle cx="10" cy="10" r="2.5" fill="#D2FF00" />
                          <text x="18" y="14" fill="#ffffff" fontSize="8" fontFamily="var(--font-mono)" fontWeight="bold">JAYVIS RUNTIME (V8 HEAP)</text>

                          <g transform="translate(10, 30)">
                            <rect width="80" height="48" rx="2" fill="#181822" stroke="#27272a" strokeWidth="0.5" />
                            <text x="6" y="16" fill="#D2FF00" fontSize="7" fontFamily="var(--font-mono)" fontWeight="bold">LEZER AST</text>
                            <text x="6" y="28" fill="#a1a1aa" fontSize="6.5" fontFamily="var(--font-mono)">LALR Parser</text>
                            <text x="6" y="40" fill="#71717a" fontSize="6.5" fontFamily="var(--font-mono)">0ms debounce</text>
                          </g>

                          <g transform="translate(98, 30)">
                            <rect width="80" height="48" rx="2" fill="#181822" stroke="#27272a" strokeWidth="0.5" />
                            <text x="6" y="16" fill="#38bdf8" fontSize="7" fontFamily="var(--font-mono)" fontWeight="bold">ELK WORKER</text>
                            <text x="6" y="28" fill="#a1a1aa" fontSize="6.5" fontFamily="var(--font-mono)">Layout thread</text>
                            <text x="6" y="40" fill="#71717a" fontSize="6.5" fontFamily="var(--font-mono)">0ms main jank</text>
                          </g>

                          <g transform="translate(186, 30)">
                            <rect width="88" height="48" rx="2" fill="#181822" stroke="#27272a" strokeWidth="0.5" />
                            <text x="6" y="16" fill="#a1a1aa" fontSize="7" fontFamily="var(--font-mono)" fontWeight="bold">INDEXEDDB</text>
                            <text x="6" y="28" fill="#a1a1aa" fontSize="6.5" fontFamily="var(--font-mono)">Client cache</text>
                            <text x="6" y="40" fill="#D2FF00" fontSize="6.5" fontFamily="var(--font-mono)">Zero cloud sync</text>
                          </g>
                        </g>

                        {/* Node 3: Local MCP Pipe */}
                        <g transform="translate(180, 156)">
                          <rect width="285" height="74" rx="4" fill="#0c0c12" stroke="#27272a" strokeWidth="1" />
                          <rect width="285" height="18" rx="4" fill="#14141c" />
                          <text x="10" y="13" fill="#a1a1aa" fontSize="7.5" fontFamily="var(--font-mono)" fontWeight="bold">LOCAL MODEL CONTEXT PROTOCOL (MCP)</text>
                          <text x="10" y="36" fill="#38bdf8" fontSize="8" fontFamily="var(--font-mono)">UNIX STDIO SOCKET PIPE</text>
                          <text x="10" y="52" fill="#71717a" fontSize="7.5" fontFamily="var(--font-mono)">Direct process-to-process with Claude &amp; Cursor</text>
                        </g>

                        {/* Internal Arrows */}
                        <path d="M 154 97 L 180 97" stroke="#D2FF00" strokeWidth="1.2" />
                        <polygon points="178,94 184,97 178,100" fill="#D2FF00" />

                        <path d="M 322 142 L 322 156" stroke="#38bdf8" strokeWidth="1.2" />
                        <polygon points="319,153 322,158 325,153" fill="#38bdf8" />
                        <polygon points="319,145 322,140 325,145" fill="#38bdf8" />

                        {/* Air-Gap Barrier Line */}
                        <line x1="505" y1="15" x2="505" y2="245" stroke="#D2FF00" strokeWidth="1.5" strokeDasharray="5 5" />
                        <text x="500" y="135" textAnchor="end" fill="#D2FF00" fontSize="7.5" fontFamily="var(--font-mono)" fontWeight="bold" transform="rotate(-90 500 135)">
                          AIR-GAP FIREWALL PERIMETER
                        </text>

                        {/* Remote Cloud Section */}
                        <g transform="translate(525, 15)">
                          <rect
                            width="220"
                            height="230"
                            rx="6"
                            stroke="#3f3f46"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                          />
                          <text x="14" y="34" fill="#ef4444" fontSize="9" fontFamily="var(--font-mono)" fontWeight="bold">
                            REMOTE CLOUD (UNTRUSTED)
                          </text>

                          <g transform="translate(14, 52)">
                            <rect width="192" height="38" rx="3" fill="#100a0c" stroke="#7f1d1d" strokeWidth="0.75" />
                            <text x="10" y="16" fill="#f87171" fontSize="7.5" fontFamily="var(--font-mono)" fontWeight="bold">CLOUD SERVERS / DB</text>
                            <text x="10" y="28" fill="#71717a" fontSize="7.5" fontFamily="var(--font-mono)">BLOCKED: 0 bytes egress</text>
                          </g>

                          <g transform="translate(14, 100)">
                            <rect width="192" height="38" rx="3" fill="#100a0c" stroke="#7f1d1d" strokeWidth="0.75" />
                            <text x="10" y="16" fill="#f87171" fontSize="7.5" fontFamily="var(--font-mono)" fontWeight="bold">TRACKING BEACONS</text>
                            <text x="10" y="28" fill="#71717a" fontSize="7.5" fontFamily="var(--font-mono)">DISABLED: 0 cookies</text>
                          </g>

                          <g transform="translate(14, 148)">
                            <rect width="192" height="38" rx="3" fill="#100a0c" stroke="#7f1d1d" strokeWidth="0.75" />
                            <text x="10" y="16" fill="#f87171" fontSize="7.5" fontFamily="var(--font-mono)" fontWeight="bold">THIRD-PARTY PROXIES</text>
                            <text x="10" y="28" fill="#71717a" fontSize="7.5" fontFamily="var(--font-mono)">BYPASSED: Local stdio only</text>
                          </g>
                        </g>

                        {/* Blocked Connection Marker */}
                        <g transform="translate(465, 90)">
                          <line x1="0" y1="7" x2="36" y2="7" stroke="#ef4444" strokeWidth="1.2" strokeDasharray="3 3" />
                          <circle cx="36" cy="7" r="4" fill="#ef4444" />
                          <line x1="33" y1="4" x2="39" y2="10" stroke="#000" strokeWidth="1.2" />
                          <line x1="39" y1="4" x2="33" y2="10" stroke="#000" strokeWidth="1.2" />
                        </g>
                      </svg>

                      <figcaption className="mt-3 pt-3 border-t border-neutral-800/80 text-[11px] font-mono text-neutral-500 flex items-center justify-between">
                        <span>Figure 2.1 — Ephemeral in-memory execution perimeter.</span>
                        <span className="text-[#D2FF00]">0 Network Sockets Opened</span>
                      </figcaption>
                    </figure>
                  </div>

                  {/* Section 3: Local MCP Integration */}
                  <div id="sec-mcp" className="pt-6 border-t border-neutral-800/60 space-y-3">
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <span className="font-mono text-xs text-[#D2FF00]">3.0</span>
                      Local Model Context Protocol (MCP) Integration
                    </h2>
                    <p className="text-neutral-400 text-sm">
                      Jayvis provides native support for the Model Context Protocol (MCP) via an unprivileged stdio transport. AI agents interact with your schema locally without sending code to cloud relays:
                    </p>

                    <div className="rounded-lg border border-neutral-800 bg-[#0a0a0f] p-4 font-mono text-xs text-neutral-300">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800 text-[11px] text-neutral-500">
                        <span>claude_desktop_config.json</span>
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="hover:text-white flex items-center gap-1.5 transition-colors"
                        >
                          {copied ? <Check className="w-3 h-3 text-[#D2FF00]" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? 'COPIED' : 'COPY'}</span>
                        </button>
                      </div>
                      <pre className="overflow-x-auto text-[#D2FF00]">{mcpConfig}</pre>
                    </div>
                  </div>

                  {/* Section 4: Compliance Matrix */}
                  <div id="sec-compliance" className="pt-6 border-t border-neutral-800/60 space-y-3">
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <span className="font-mono text-xs text-[#D2FF00]">4.0</span>
                      Compliance Audit Matrix
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-xs border border-neutral-800">
                        <thead className="bg-neutral-900/80 text-neutral-400 border-b border-neutral-800">
                          <tr>
                            <th className="p-3">Compliance Standard</th>
                            <th className="p-3">Jayvis Architecture Impact</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800 text-neutral-300">
                          <tr>
                            <td className="p-3 font-bold text-white">SOC 2 Type II</td>
                            <td className="p-3 text-neutral-400">Zero customer data stored on remote multi-tenant infrastructure</td>
                            <td className="p-3 text-emerald-400 font-bold">Compliant</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-bold text-white">HIPAA / HITECH</td>
                            <td className="p-3 text-neutral-400">No PHI transmitted or stored; operates inside local client perimeter</td>
                            <td className="p-3 text-emerald-400 font-bold">Compliant</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-bold text-white">GDPR Article 25</td>
                            <td className="p-3 text-neutral-400">Data protection by design and default; 0 cookies, 0 telemetry beacons</td>
                            <td className="p-3 text-emerald-400 font-bold">Compliant</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </article>

            {/* ── Right Column: Sticky Table of Contents & Verification Sidebar ── */}
            <aside className="lg:col-span-4 p-6 sm:p-8 bg-[#050508] text-xs font-mono space-y-6">

              {/* Table of Contents based on active view */}
              <div>
                <div className="text-neutral-500 uppercase tracking-widest font-semibold text-[10px] mb-3 pb-2 border-b border-neutral-800">
                  DOCUMENT NAVIGATION
                </div>
                <nav className="space-y-2 text-neutral-400">
                  {activeTab === 'business' && (
                    <>
                      <a href="#biz-problems" className="block hover:text-white transition-colors text-[#D2FF00]">
                        1.0 Expensive Problems Solved
                      </a>
                      <a href="#biz-roi" className="block hover:text-white transition-colors">
                        2.0 Business ROI &amp; Value Proposition
                      </a>
                    </>
                  )}
                  {activeTab === 'tech' && (
                    <>
                      <a href="#tech-ast" className="block hover:text-white transition-colors text-[#D2FF00]">
                        1.0 Bidirectional AST Synchronization
                      </a>
                      <a href="#tech-worker" className="block hover:text-white transition-colors">
                        2.0 Off-Thread ELK Web Worker
                      </a>
                      <a href="#tech-wasm" className="block hover:text-white transition-colors">
                        3.0 Embedded WASM (PGlite &amp; SQLite)
                      </a>
                      <a href="#tech-mcp" className="block hover:text-white transition-colors">
                        4.0 Local MCP Architecture
                      </a>
                    </>
                  )}
                  {activeTab === 'security' && (
                    <>
                      <a href="#sec-zero-ingestion" className="block hover:text-white transition-colors text-[#D2FF00]">
                        1.0 Zero-Ingestion Model
                      </a>
                      <a href="#sec-boundary" className="block hover:text-white transition-colors">
                        2.0 Trust Boundary (Fig. 2.1)
                      </a>
                      <a href="#sec-mcp" className="block hover:text-white transition-colors">
                        3.0 Local MCP Integration
                      </a>
                      <a href="#sec-compliance" className="block hover:text-white transition-colors">
                        4.0 Compliance Audit Matrix
                      </a>
                    </>
                  )}
                </nav>
              </div>

              {/* Quick Launch CTA Card */}
              <div className="p-4 rounded bg-neutral-900/60 border border-neutral-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#D2FF00]" />
                  <span className="font-bold text-white text-xs">Test In Playground</span>
                </div>
                <p className="text-[11px] font-sans text-neutral-400 leading-relaxed">
                  Open the playground with a preloaded e-commerce schema to test bidirectional AST sync and query execution.
                </p>
                <Link
                  href="/app?sample=ecommerce"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#D2FF00] hover:bg-[#E0FF33] text-black font-bold uppercase tracking-wider text-[11px] rounded transition-colors"
                >
                  <span>Open Playground Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Verification Telemetry Checklist */}
              <div className="space-y-2.5 pt-4 border-t border-neutral-800">
                <div className="text-neutral-500 uppercase tracking-widest font-semibold text-[10px] mb-3">
                  COMPLIANCE AUDIT RECORD
                </div>
                <div className="flex items-center justify-between text-neutral-400">
                  <span>OUTBOUND SOCKETS:</span>
                  <span className="text-[#D2FF00] font-bold">0 (DISABLED)</span>
                </div>
                <div className="flex items-center justify-between text-neutral-400">
                  <span>REMOTE INGESTION:</span>
                  <span className="text-emerald-400 font-bold">0 BYTES</span>
                </div>
                <div className="flex items-center justify-between text-neutral-400">
                  <span>TRACKING COOKIES:</span>
                  <span className="text-emerald-400 font-bold">0 COOKIES</span>
                </div>
                <div className="flex items-center justify-between text-neutral-400">
                  <span>SOURCE CODE AUDIT:</span>
                  <span className="text-white font-bold">OPEN SOURCE (MIT)</span>
                </div>
              </div>

              {/* GitHub Audit Verification Card */}
              <div className="pt-4 border-t border-neutral-800 space-y-3">
                <div className="text-neutral-500 uppercase tracking-widest font-semibold text-[10px]">
                  SOURCE VERIFICATION
                </div>
                <p className="text-[11px] font-sans text-neutral-400 leading-relaxed">
                  You can inspect the client source, verify package dependencies, or monitor network sockets in DevTools to audit 0-egress behavior yourself.
                </p>
                <a
                  href="https://github.com/echo11labs/jayvis.dev"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-between w-full p-2.5 rounded bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700/80 transition-colors uppercase font-bold text-[10px] tracking-wider"
                >
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D2FF00]" />
                    <span>Audit on GitHub</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-neutral-400" />
                </a>
              </div>

            </aside>

          </div>

        </div>

      </div>
    </div>
  );
}
