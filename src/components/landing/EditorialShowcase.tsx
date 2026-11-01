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
}

const DIALECTS: DialectSpec[] = [
  {
    id: 'postgres',
    name: 'PostgreSQL',
    code: 'PG',
    icon: PostgresLogo,
    version: 'PostgreSQL 14–17',
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
    stat: '< 15ms',
    label: 'INCREMENTAL AST PARSE',
    icon: Gauge,
    context: 'Lezer LALR parser computes character-level document changes on every keystroke with zero UI debounce lag.',
  },
  {
    stat: '< 550ms',
    label: '47-TABLE ENTERPRISE LAYOUT',
    icon: Layers,
    context: 'Full orthogonal ELK spatial coordinates and migration diff on complex enterprise e-commerce schemas.',
  },
  {
    stat: '210 / 210',
    label: 'VERIFIED AUTOMATED TESTS',
    icon: ShieldCheck,
    context: 'Passing test suites across circular references, composite keys, SQL DDL compilers, and migration diffs.',
  },
  {
    stat: '0 KB',
    label: 'NETWORK EGRESS',
    icon: Activity,
    context: '100% in-browser memory execution. Zero credentials transmitted, zero server indexing, zero telemetry.',
  },
];

export function EditorialShowcase() {
  const [selectedDialect, setSelectedDialect] = useState<DialectSpec>(DIALECTS[0]);
  const [copied, setCopied] = useState(false);

  const SelectedDialectIcon = selectedDialect.icon;

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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center mb-24 sm:mb-32">
          
          {/* Left: Free-Standing Multi-Dialect Illustration */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center">
            <div className="relative aspect-[16/9] w-full group">
              <Image
                src="/images/illustrations/capability-multi-dialect-matrix.jpg"
                alt="Multi-Dialect Polyglot Compiler Hub Matrix"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain object-center [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,#000_50%,transparent_95%)] group-hover:scale-[1.02] transition-transform duration-700"
                priority
              />
            </div>

            <div className="mt-4 flex items-center gap-2 font-mono text-[11px] text-neutral-500">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D2FF00]" />
              <span>FIG 03 // COMPILER MATRIX — 5 SYNCHRONOUS TARGET ENGINES</span>
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

            <p className="text-sm text-neutral-400 leading-relaxed mb-5">
              {selectedDialect.description}
            </p>

            {/* Code Output Window: Clean & Unboxed */}
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

              <div className="p-4 font-mono text-xs leading-relaxed overflow-x-auto text-neutral-200">
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

        {/* ── Measured Performance Benchmarks: Open Architectural Strip ── */}
        <div id="benchmarks" className="pt-20 border-t border-neutral-800/80">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-14">
            <div>
              <p className="font-mono text-xs sm:text-[13px] font-semibold tracking-[0.2em] uppercase text-[#D2FF00] mb-2">
                MEASURED PERFORMANCE // REAL-WORLD BENCHMARKS
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Tested against real-world production complexity.
              </h3>
            </div>
            <div className="font-mono text-xs text-neutral-500 shrink-0">
              Benchmarked on 47-Table E-Commerce Schema
            </div>
          </div>

          {/* 4 Stat Columns: Open, Breathable, No Nested Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
            {BENCHMARKS.map((b) => {
              const BenchmarkIcon = b.icon;
              return (
                <div key={b.label} className="flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <BenchmarkIcon className="w-4 h-4 text-[#D2FF00]" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#D2FF00]">
                        {b.label}
                      </span>
                    </div>

                    <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-white mb-2">
                      {b.stat}
                    </div>

                    <p className="text-xs sm:text-sm text-neutral-400 font-sans leading-relaxed">
                      {b.context}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
