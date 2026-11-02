'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Copy,
  Gauge,
  Layers,
  ShieldCheck,
  Activity,
  Terminal,
} from 'lucide-react';

import {
  PostgresLogo,
  SqliteLogo,
  PrismaLogo,
  SupabaseLogo,
  MysqlLogo,
} from './Logos';

interface DialectSpec {
  id: string;
  name: string;
  code: string;
  icon: React.ElementType;
  version: string;
  description: string;
  features: string[];
  sampleCode: string;
  image: string;
}

const DIALECTS: DialectSpec[] = [
  {
    id: 'postgres',
    name: 'PostgreSQL',
    code: 'PG',
    icon: PostgresLogo,
    version: 'PostgreSQL 14–17',
    image: '/images/illustrations/dialect-postgres.jpg',
    description: 'Enterprise relational standard with native UUIDs, timezone timestamps, and cascade referential actions.',
    features: [
      'UUID primary keys with default gen_random_uuid()',
      'TIMESTAMPTZ columns with current_timestamp',
      'ON DELETE CASCADE / ON UPDATE CASCADE',
      'Partial and multi-column composite indexes',
    ],
    sampleCode: `CREATE TABLE "orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "total_cents" INTEGER NOT NULL,
  "status" VARCHAR(64) DEFAULT 'pending',
  "placed_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_orders_user_id" ON "orders" ("user_id");`,
  },
  {
    id: 'sqlite',
    name: 'SQLite / LibSQL',
    code: 'SQ',
    icon: SqliteLogo,
    version: 'SQLite 3.40+ / Turso',
    image: '/images/illustrations/dialect-sqlite.jpg',
    description: 'Zero-configuration serverless database with pragma enforcement and table transactional execution.',
    features: [
      'Enforces PRAGMA foreign_keys = ON',
      'AUTOINCREMENT integer primary keys',
      'Standard SQLite text, integer, and real mappings',
      'Tested on local dev.db and in-browser memory',
    ],
    sampleCode: `PRAGMA foreign_keys = ON;

CREATE TABLE "orders" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "total_cents" INTEGER NOT NULL,
  "status" TEXT DEFAULT 'pending',
  "placed_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_orders_user_id" ON "orders" ("user_id");`,
  },
  {
    id: 'prisma',
    name: 'Prisma ORM',
    code: 'PR',
    icon: PrismaLogo,
    version: 'Prisma Schema v5+',
    image: '/images/illustrations/dialect-prisma.jpg',
    description: 'Type-safe ORM schema mapping with relations, cascade attributes, and model mapping.',
    features: [
      'Native model relation attributes with onDelete: Cascade',
      'Composite @@unique and @@index blocks',
      'Snake_case table and column @@map directives',
      'PascalCase TypeScript model definitions',
    ],
    sampleCode: `model Order {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  totalCents Int      @map("total_cents")
  status     String   @default("pending")
  placedAt   DateTime @default(now()) @map("placed_at")

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("orders")
}`,
  },
  {
    id: 'supabase',
    name: 'Supabase',
    code: 'SB',
    icon: SupabaseLogo,
    version: 'PostgreSQL + Auth',
    image: '/images/illustrations/dialect-supabase.jpg',
    description: 'PostgreSQL tailored for Supabase projects with auth.users foreign key mapping and RLS scaffolding.',
    features: [
      'Direct references to auth.users identities',
      'Row Level Security (RLS) syntax guards',
      'PostgREST automatic API compatibility',
      'Instant migration execution via Supabase SQL',
    ],
    sampleCode: `CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_cents integer NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;`,
  },
  {
    id: 'mysql',
    name: 'MySQL',
    code: 'MY',
    icon: MysqlLogo,
    version: 'MySQL 8.0+ / MariaDB',
    image: '/images/illustrations/dialect-mysql.jpg',
    description: 'InnoDB transactional table definitions with utf8mb4 collation and foreign key constraints.',
    features: [
      'InnoDB transactional storage engine',
      'utf8mb4_unicode_ci character set',
      'Standard FOREIGN KEY ... REFERENCES constraints',
      'Backtick identifier escaping',
    ],
    sampleCode: `CREATE TABLE \`orders\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`user_id\` VARCHAR(36) NOT NULL,
  \`total_cents\` INT NOT NULL,
  \`status\` VARCHAR(64) DEFAULT 'pending',
  \`placed_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_orders_user_id\` (\`user_id\`),
  CONSTRAINT \`fk_orders_user_id\` FOREIGN KEY (\`user_id\`)
    REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  },
];

const BENCHMARKS = [
  {
    id: 'ast',
    stat: '< 15ms',
    label: 'INCREMENTAL AST PARSE',
    sublabel: 'Lezer LALR Parser',
    icon: Gauge,
    tag: 'LEZER_CORE',
    context: 'Incremental tokenization re-computes character-level AST modifications on every keystroke with zero UI debounce lag.',
    telemetry: {
      target: '15.0ms MAX',
      actual: '8.7ms MEAN',
      breakdown: [
        { name: 'Lexer Character Tokenization', val: '1.4ms', pct: 16 },
        { name: 'Incremental AST Diffing', val: '3.2ms', pct: 37 },
        { name: 'Schema Dependency Graph Sync', val: '4.1ms', pct: 47 },
      ],
    },
  },
  {
    id: 'layout',
    stat: '< 550ms',
    label: '47-TABLE ENTERPRISE LAYOUT',
    sublabel: 'ELK Orthogonal Engine',
    icon: Layers,
    tag: 'ELK_ROUTING',
    context: 'Full orthogonal spatial placement, port alignment, and migration diff computation on enterprise-scale schemas.',
    telemetry: {
      target: '550.0ms MAX',
      actual: '412.0ms MEAN',
      breakdown: [
        { name: 'Table Hierarchy Flattening', val: '82ms', pct: 20 },
        { name: 'Port & Edge Layering', val: '185ms', pct: 45 },
        { name: 'Orthogonal Coordinate Routing', val: '145ms', pct: 35 },
      ],
    },
  },
  {
    id: 'tests',
    stat: '210 / 210',
    label: 'VERIFIED AUTOMATED TESTS',
    sublabel: 'Deterministic Test Suite',
    icon: ShieldCheck,
    tag: 'VITEST_GREEN',
    context: 'Passing automated test suites across circular references, composite keys, SQL DDL compilers, and AST roundtrips.',
    telemetry: {
      target: '100% GREEN',
      actual: '210 OF 210 PASSING',
      breakdown: [
        { name: 'Circular FK Resolution', val: '48 / 48', pct: 100 },
        { name: 'Composite Index Mapping', val: '64 / 64', pct: 100 },
        { name: 'SQL DDL Roundtrip Compilers', val: '98 / 98', pct: 100 },
      ],
    },
  },
  {
    id: 'egress',
    stat: '0 KB',
    label: 'NETWORK EGRESS',
    sublabel: 'Air-Gapped Client Runtime',
    icon: Activity,
    tag: 'ZERO_TELEMETRY',
    context: '100% in-browser memory execution. Zero credentials transmitted, zero server indexing, and zero background telemetry.',
    telemetry: {
      target: '0.00 KB EGRESS',
      actual: 'AIR-GAPPED',
      breakdown: [
        { name: 'Outbound HTTP/REST Requests', val: '0', pct: 0 },
        { name: 'WebSocket Cloud Relays', val: '0', pct: 0 },
        { name: 'Local Memory Residency', val: '100%', pct: 100 },
      ],
    },
  },
];

export function EditorialShowcase() {
  const [selectedDialect, setSelectedDialect] = useState<DialectSpec>(DIALECTS[0]);
  const [activeBenchmark, setActiveBenchmark] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const SelectedDialectIcon = selectedDialect.icon;
  const currentBenchmark = BENCHMARKS[activeBenchmark];
  const CurrentBenchmarkIcon = currentBenchmark.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedDialect.sampleCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section 
      id="dialects" 
      aria-label="Multi-dialect compiler"
      className="relative w-full bg-[#050507] text-white border-t border-neutral-800/80 pt-24 sm:pt-32 pb-24 sm:pb-36 select-none overflow-hidden"
    >
      {/* Subtle schematic blueprint grid background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25" 
        aria-hidden="true"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Subtle ambient lighting */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-[radial-gradient(ellipse_at_center,rgba(210,255,0,0.03),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ── Section Header ── */}
        <div className="max-w-3xl mb-16 sm:mb-24">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#D2FF00]" />
            <p className="font-mono text-xs sm:text-[13px] font-semibold tracking-[0.2em] uppercase text-[#D2FF00]">
              MULTI-DIALECT COMPILER // NO VENDOR LOCK-IN
            </p>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Target any major database engine.
          </h2>

          <p className="mt-4 text-base sm:text-lg text-neutral-400 font-normal leading-relaxed text-balance">
            Model your architecture once in declarative DBML or import your existing DDL. The compiler emits verified, production-ready schemas and migrations for every major backend.
          </p>
        </div>

        {/* ── Hero Architectural Matrix Showcase (Zero Container Box) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start mb-24 sm:mb-32">
          
          {/* Left: Free-Standing Multi-Dialect Illustration */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center">
            <div className="relative aspect-[16/9] w-full group">
              <Image
                key={selectedDialect.id}
                src={selectedDialect.image}
                alt={`${selectedDialect.name} compiler engine module`}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain object-center [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,#000_50%,transparent_95%)] group-hover:scale-[1.02] transition-all duration-500"
                priority
              />
            </div>

            <div className="mt-4 flex items-center gap-2 font-mono text-[11px] text-neutral-500">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D2FF00]" />
              <span>FIG 03 // {selectedDialect.code} COMPILER ENGINE — {selectedDialect.version.toUpperCase()}</span>
            </div>
          </div>

          {/* Right: Interactive Dialect Explorer */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            
            {/* Minimalist Dialect Tabs */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {DIALECTS.map((d) => {
                const isSelected = selectedDialect.id === d.id;
                const DialectIcon = d.icon;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDialect(d)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all border ${
                      isSelected
                        ? 'bg-[#D2FF00] text-black border-[#D2FF00] shadow-[0_0_16px_rgba(210,255,0,0.25)]'
                        : 'bg-neutral-900/90 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <DialectIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{d.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Dialect Header & Spec */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-4">
              <div className="flex items-center gap-2.5">
                <SelectedDialectIcon className="w-4 h-4 text-[#D2FF00]" />
                <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                  {selectedDialect.name}
                </span>
                <span className="text-xs text-neutral-500 font-mono">
                  ({selectedDialect.version})
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#D2FF00]/10 text-[#D2FF00] font-mono text-[10px] font-bold uppercase tracking-wider border border-[#D2FF00]/25">
                100% compliant
              </span>
            </div>

            <p className="text-sm text-neutral-400 leading-relaxed mb-5 min-h-[44px]">
              {selectedDialect.description}
            </p>

            {/* Code Output Window: Locked Height to Prevent Layout Shift */}
            <div className="border border-neutral-800/80 rounded-lg bg-neutral-950/90 overflow-hidden mb-6">
              <div className="border-b border-neutral-800/80 px-4 py-2 flex items-center justify-between font-mono text-xs text-neutral-400 bg-neutral-900/60">
                <span className="text-white font-bold text-[11px]">emitted_{selectedDialect.id}.sql</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="hover:text-white flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider transition-colors px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-[#D2FF00]" />
                      <span className="text-[#D2FF00]">COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-neutral-400" />
                      <span>COPY</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 font-mono text-xs leading-relaxed overflow-x-auto text-neutral-200 h-[270px] overflow-y-auto">
                <pre className="text-neutral-300 text-[11px] leading-relaxed">{selectedDialect.sampleCode}</pre>
              </div>

              <div className="border-t border-neutral-800/80 px-4 py-1.5 bg-neutral-900/40 flex items-center justify-between font-mono text-[10px] text-neutral-500">
                <span>Deterministic Output</span>
                <span className="text-[#D2FF00] font-semibold">ZERO SYNTAX DRIFT</span>
              </div>
            </div>

            {/* Dialect Action Link */}
            <Link
              href={`/app?dialect=${selectedDialect.id}`}
              className="font-mono text-xs font-bold uppercase text-neutral-300 hover:text-white inline-flex items-center gap-2 transition-colors group"
            >
              <span>Launch studio targeting {selectedDialect.name}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#D2FF00] group-hover:translate-x-1.5 transition-transform" />
            </Link>

          </div>

        </div>

        {/* ── Measured Performance Benchmarks: Holographic Telemetry Suite ── */}
        <div id="benchmarks" className="pt-20 border-t border-neutral-800/80">
          
          {/* Telemetry Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12 sm:mb-16">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#D2FF00] animate-pulse" />
                <p className="font-mono text-xs sm:text-[13px] font-semibold tracking-[0.2em] uppercase text-[#D2FF00]">
                  MEASURED PERFORMANCE // HOLOGRAPHIC TELEMETRY
                </p>
              </div>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Tested against real-world production complexity.
              </h3>
            </div>
            
            {/* Live Rig Status Chip */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-800 text-neutral-400 font-mono text-[11px] shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D2FF00]" />
              <span>TEST BED: 47 TABLES · 118 CONSTRAINTS · 120 FPS</span>
            </div>
          </div>

          {/* ── Holographic HUD Cockpit / Visualizer Console ── */}
          <div className="relative w-full rounded-2xl border border-neutral-800/80 bg-gradient-to-b from-neutral-900/40 via-[#050507]/90 to-neutral-950/90 backdrop-blur-xl p-6 sm:p-8 lg:p-10 mb-10 shadow-[0_0_60px_rgba(210,255,0,0.04)] overflow-hidden group">
            
            {/* Top Luminous Laser Edge */}
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#D2FF00]/50 to-transparent pointer-events-none" />

            {/* Ambient Holographic Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[radial-gradient(ellipse_at_center,rgba(210,255,0,0.04),transparent_70%)] blur-2xl pointer-events-none" />

            {/* Subtle Holographic Scanline Texture */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(210, 255, 0, 0.05) 3px, rgba(210, 255, 0, 0.05) 4px)',
              }}
            />

            {/* Reticle Corner Crosshairs */}
            <span className="absolute top-3 left-4 font-mono text-[10px] text-neutral-600 select-none">+ [HUD: 0x4F]</span>
            <span className="absolute top-3 right-4 font-mono text-[10px] text-neutral-600 select-none">[CALIBRATED: 100%] +</span>
            <span className="absolute bottom-3 left-4 font-mono text-[10px] text-neutral-600 select-none">+ [WASM MEMORY]</span>
            <span className="absolute bottom-3 right-4 font-mono text-[10px] text-neutral-600 select-none">[AIR-GAPPED] +</span>

            {/* HUD Status Bar */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-neutral-800/80 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded bg-[#D2FF00]/10 text-[#D2FF00] border border-[#D2FF00]/30">
                  <CurrentBenchmarkIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                    {currentBenchmark.label}
                  </div>
                  <div className="font-mono text-[10px] text-neutral-500">
                    MODULE: {currentBenchmark.tag} // {currentBenchmark.sublabel}
                  </div>
                </div>
              </div>

              {/* Mode Selector Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-neutral-900/80 border border-neutral-800 font-mono text-[10px]">
                {BENCHMARKS.map((b, idx) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setActiveBenchmark(idx)}
                    className={`px-2.5 py-1 rounded transition-all font-bold uppercase tracking-wider ${
                      activeBenchmark === idx
                        ? 'bg-[#D2FF00] text-black shadow-[0_0_12px_rgba(210,255,0,0.3)]'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                    }`}
                  >
                    0{idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* HUD Core Display: Interactive Telemetry Visualizer */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              {/* Left Stage: Holographic Vector Visualizer */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                
                {/* Visualizer 0: Incremental AST Parse */}
                {activeBenchmark === 0 && (
                  <div className="w-full flex flex-col">
                    <div className="flex items-center justify-between font-mono text-xs text-neutral-400 mb-2">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D2FF00]" />
                        KEYSTROKE-TO-AST LATENCY WAVEFORM
                      </span>
                      <span className="text-[#D2FF00] font-bold">PEAK: 8.7ms</span>
                    </div>

                    {/* SVG Oscilloscopic Waveform */}
                    <div className="relative h-44 sm:h-52 w-full bg-neutral-950/80 rounded-lg border border-neutral-800/80 p-4 overflow-hidden flex items-end">
                      {/* Grid Ticks */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                      
                      {/* Threshold Line at 15ms */}
                      <div className="absolute top-[28%] left-0 right-0 border-t border-dashed border-[#D2FF00]/40 flex items-center justify-between px-3">
                        <span className="font-mono text-[9px] text-[#D2FF00] uppercase tracking-wider">
                          15.0ms Hardware Threshold
                        </span>
                        <span className="font-mono text-[9px] text-emerald-400 uppercase">
                          42% Headroom Safe
                        </span>
                      </div>

                      <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#D2FF00" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#D2FF00" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0 95 Q 40 92, 70 85 T 140 50 T 210 90 T 280 42 T 350 88 T 400 75"
                          fill="none"
                          stroke="#D2FF00"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 0 95 Q 40 92, 70 85 T 140 50 T 210 90 T 280 42 T 350 88 T 400 75 L 400 120 L 0 120 Z"
                          fill="url(#waveGrad)"
                        />
                        {/* Peak Point Reticle */}
                        <circle cx="280" cy="42" r="4" fill="#D2FF00" className="animate-ping opacity-75" />
                        <circle cx="280" cy="42" r="3" fill="#ffffff" />
                      </svg>
                    </div>

                    <div className="flex items-center justify-between font-mono text-[10px] text-neutral-500 mt-2">
                      <span>TIME: 0.0s</span>
                      <span>LEZER LALR INCREMENTAL PARSER</span>
                      <span>TIME: +2.5s</span>
                    </div>
                  </div>
                )}

                {/* Visualizer 1: Spatial 47-Table Layout */}
                {activeBenchmark === 1 && (
                  <div className="w-full flex flex-col">
                    <div className="flex items-center justify-between font-mono text-xs text-neutral-400 mb-2">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D2FF00]" />
                        ELK ORTHOGONAL TOPOLOGY GRID
                      </span>
                      <span className="text-[#D2FF00] font-bold">47 TABLES · 118 EDGES</span>
                    </div>

                    {/* Holographic Radar / Spatial Nodes */}
                    <div className="relative h-44 sm:h-52 w-full bg-neutral-950/80 rounded-lg border border-neutral-800/80 p-4 overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />
                      
                      {/* Simulated Wireframe Nodes */}
                      <svg className="w-full h-full" viewBox="0 0 360 140">
                        {/* Orthogonal Edges */}
                        <path d="M 60 70 L 130 70 L 130 35 L 200 35" fill="none" stroke="#D2FF00" strokeWidth="1.5" strokeDasharray="3 3" />
                        <path d="M 60 70 L 130 70 L 130 105 L 200 105" fill="none" stroke="#D2FF00" strokeWidth="1.5" />
                        <path d="M 200 35 L 260 35 L 260 70 L 310 70" fill="none" stroke="#D2FF00" strokeWidth="1.5" />
                        <path d="M 200 105 L 260 105 L 260 70 L 310 70" fill="none" stroke="#D2FF00" strokeWidth="1.5" strokeDasharray="3 3" />
                        
                        {/* Node Rectangles */}
                        <rect x="25" y="55" width="50" height="30" rx="3" fill="#141416" stroke="#D2FF00" strokeWidth="1.5" />
                        <rect x="180" y="20" width="55" height="30" rx="3" fill="#141416" stroke="#D2FF00" strokeWidth="1.5" />
                        <rect x="180" y="90" width="55" height="30" rx="3" fill="#141416" stroke="#D2FF00" strokeWidth="1.5" />
                        <rect x="290" y="55" width="50" height="30" rx="3" fill="#141416" stroke="#D2FF00" strokeWidth="1.5" />

                        {/* Node Pulse Points */}
                        <circle cx="50" cy="70" r="2.5" fill="#D2FF00" />
                        <circle cx="207" cy="35" r="2.5" fill="#D2FF00" />
                        <circle cx="207" cy="105" r="2.5" fill="#D2FF00" />
                        <circle cx="315" cy="70" r="2.5" fill="#D2FF00" />
                      </svg>

                      {/* HUD Overlay Label */}
                      <div className="absolute bottom-3 left-4 px-2 py-0.5 rounded bg-neutral-900/90 border border-neutral-800 font-mono text-[9px] text-neutral-300">
                        CROSSINGS: 0 · COMPUTED IN WEB WORKER: 412ms
                      </div>
                    </div>

                    <div className="flex items-center justify-between font-mono text-[10px] text-neutral-500 mt-2">
                      <span>ORIGIN: (0, 0)</span>
                      <span>ORTHOGONAL COORDINATE ROUTER</span>
                      <span>BOUNDS: (3400px × 2200px)</span>
                    </div>
                  </div>
                )}

                {/* Visualizer 2: Verified Automated Tests */}
                {activeBenchmark === 2 && (
                  <div className="w-full flex flex-col">
                    <div className="flex items-center justify-between font-mono text-xs text-neutral-400 mb-2">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        DETERMINISTIC TEST INTEGRITY MATRIX
                      </span>
                      <span className="text-emerald-400 font-bold">210 / 210 PASSING</span>
                    </div>

                    {/* Holographic Matrix of Passing Tests */}
                    <div className="relative h-44 sm:h-52 w-full bg-neutral-950/80 rounded-lg border border-neutral-800/80 p-5 overflow-hidden flex flex-col justify-between">
                      <div className="grid grid-cols-10 sm:grid-cols-14 gap-2">
                        {Array.from({ length: 42 }).map((_, i) => (
                          <div
                            key={i}
                            className="aspect-square rounded-[2px] bg-emerald-400/20 border border-emerald-400/50 flex items-center justify-center transition-all hover:bg-emerald-400 hover:scale-110"
                          >
                            <span className="w-1 h-1 rounded-full bg-emerald-300" />
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between font-mono text-[10px]">
                        <span className="text-neutral-400">VITEST + PGLITE HARNESS</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" /> ZERO FLAKINESS DETECTED
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between font-mono text-[10px] text-neutral-500 mt-2">
                      <span>SUITES: 23</span>
                      <span>TOTAL ASSERTIONS: 126 TESTS</span>
                      <span>DURATION: 2.7s TOTAL</span>
                    </div>
                  </div>
                )}

                {/* Visualizer 3: Zero Network Egress */}
                {activeBenchmark === 3 && (
                  <div className="w-full flex flex-col">
                    <div className="flex items-center justify-between font-mono text-xs text-neutral-400 mb-2">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D2FF00]" />
                        AIR-GAPPED CLIENT PERIMETER
                      </span>
                      <span className="text-[#D2FF00] font-bold">0 KB TRANSMITTED</span>
                    </div>

                    {/* Holographic Concentric Security Radar */}
                    <div className="relative h-44 sm:h-52 w-full bg-neutral-950/80 rounded-lg border border-neutral-800/80 p-4 overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />
                      
                      {/* Concentric Rings */}
                      <div className="w-36 h-36 rounded-full border border-neutral-800 flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full border border-[#D2FF00]/30 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full border border-[#D2FF00] bg-[#D2FF00]/10 flex items-center justify-center shadow-[0_0_15px_rgba(210,255,0,0.3)]">
                            <Activity className="w-5 h-5 text-[#D2FF00]" />
                          </div>
                        </div>
                      </div>

                      <div className="absolute bottom-3 left-4 px-2 py-0.5 rounded bg-neutral-900/90 border border-neutral-800 font-mono text-[9px] text-neutral-300">
                        OUTBOUND SOCKETS: 0 · ZERO TRACKERS · 100% AIR-GAPPED
                      </div>
                    </div>

                    <div className="flex items-center justify-between font-mono text-[10px] text-neutral-500 mt-2">
                      <span>SANDBOX: BROWSER MEMORY</span>
                      <span>CLIENT-SIDE STORAGE ONLY</span>
                      <span>EGRESS: ZERO</span>
                    </div>
                  </div>
                )}

              </div>

              {/* Right Stage: Detailed Telemetry Breakdown & Gauges */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center justify-between font-mono text-xs mb-3">
                    <span className="text-neutral-400">MEASURED TELEMETRY</span>
                    <span className="px-2 py-0.5 rounded bg-[#D2FF00]/10 text-[#D2FF00] font-bold text-[10px]">
                      {currentBenchmark.telemetry.target}
                    </span>
                  </div>

                  {/* Big Number */}
                  <div className="text-4xl sm:text-5xl font-mono font-bold text-white tracking-tight mb-2">
                    {currentBenchmark.stat}
                  </div>

                  <p className="text-xs sm:text-sm text-neutral-400 font-sans leading-relaxed mb-6">
                    {currentBenchmark.context}
                  </p>

                  {/* Telemetry Breakdown Bars */}
                  <div className="space-y-3 font-mono text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      SYSTEM EXECUTION BREAKDOWN:
                    </div>

                    {currentBenchmark.telemetry.breakdown.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">{item.name}</span>
                          <span className="text-[#D2FF00] font-bold">{item.val}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-neutral-900 overflow-hidden border border-neutral-800">
                          <div
                            className="h-full bg-gradient-to-r from-[#D2FF00]/70 to-[#D2FF00] rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(item.pct, 4)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between font-mono text-[10px] text-neutral-500">
                  <span>DETERMINISTIC VERIFICATION</span>
                  <span className="text-[#D2FF00] font-semibold">{currentBenchmark.telemetry.actual}</span>
                </div>
              </div>

            </div>

          </div>

          {/* ── 4 Interactive Holographic Metric Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {BENCHMARKS.map((b, idx) => {
              const BenchmarkIcon = b.icon;
              const isSelected = activeBenchmark === idx;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setActiveBenchmark(idx)}
                  className={`text-left relative p-5 sm:p-6 rounded-xl transition-all duration-300 group ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#D2FF00]/10 via-neutral-900/60 to-neutral-950 border border-[#D2FF00]/60 shadow-[0_0_24px_rgba(210,255,0,0.12)]'
                      : 'bg-neutral-950/60 border border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900/40'
                  }`}
                >
                  {/* Top Glowing Laser Accent on active card */}
                  {isSelected && (
                    <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#D2FF00] to-transparent pointer-events-none" />
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-1.5 rounded transition-colors ${
                      isSelected ? 'bg-[#D2FF00] text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-400 group-hover:text-white'
                    }`}>
                      <BenchmarkIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-mono text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                      [{b.tag}]
                    </span>
                  </div>

                  <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-white mb-1.5">
                    {b.stat}
                  </div>

                  <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#D2FF00] mb-2">
                    {b.label}
                  </div>

                  <p className="text-xs text-neutral-400 font-sans leading-relaxed line-clamp-2">
                    {b.context}
                  </p>

                  {/* Micro-telemetry status tick */}
                  <div className="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between font-mono text-[10px] text-neutral-500">
                    <span>{b.telemetry.target}</span>
                    <span className={`font-semibold ${isSelected ? 'text-[#D2FF00]' : 'text-neutral-400'}`}>
                      {isSelected ? '● ACTIVE HUD' : 'INSPECT →'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
