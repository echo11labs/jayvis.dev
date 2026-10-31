'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Copy,
  Gauge,
  Layers,
  ShieldCheck,
  Activity,
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
    features: ['UUID primary keys with default gen_random_uuid()', 'TIMESTAMPTZ columns with current_timestamp', 'ON DELETE CASCADE / ON UPDATE CASCADE', 'Partial and multi-column composite indexes'],
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
    features: ['Enforces PRAGMA foreign_keys = ON', 'AUTOINCREMENT integer primary keys', 'Standard SQLite text, integer, and real mappings', 'Tested on local dev.db and in-browser memory'],
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
    features: ['Native model relation attributes with onDelete: Cascade', 'Composite @@unique and @@index blocks', 'Snake_case table and column @@map directives', 'PascalCase TypeScript model definitions'],
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
    features: ['Direct references to auth.users identities', 'Row Level Security (RLS) syntax guards', 'PostgREST automatic API compatibility', 'Instant migration execution via Supabase SQL'],
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
    features: ['InnoDB transactional storage engine', 'utf8mb4_unicode_ci character set', 'Standard FOREIGN KEY ... REFERENCES constraints', 'Backtick identifier escaping'],
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
    <section id="dialects" className="w-full bg-black text-white border-t border-neutral-800/80 select-none">
      {/* 1. Multi-Dialect Compiler Header Band */}
      <div className="border-b border-neutral-800 px-4 sm:px-6 lg:px-8 py-16 sm:py-20 bg-black">
        <div className="max-w-[1240px] mx-auto">
          {/* Eyebrow - Pure typography, no badge container */}
          <p className="font-mono text-xs sm:text-[13px] font-semibold tracking-[0.2em] uppercase text-[#D2FF00] mb-3">
            MULTI-DIALECT COMPILER // NO VENDOR LOCK-IN
          </p>

          <div className="max-w-3xl">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Target any major database engine.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-neutral-400 font-sans leading-relaxed">
              Model your architecture once in declarative DBML or import your existing DDL. The compiler emits verified, production-ready migrations and ORM schemas for every popular backend.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Interactive Dialect Selector & Live Emitted Code */}
      <div className="border-b border-neutral-800 bg-[#080808]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          {/* Dialect Tabs with Authentic Logos */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-500 mr-2">
              SELECT COMPILER TARGET:
            </span>
            {DIALECTS.map((d) => {
              const isSelected = selectedDialect.id === d.id;
              const DialectIcon = d.icon;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDialect(d)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-all border rounded-none ${
                    isSelected
                      ? 'bg-black text-white border-[#D2FF00] shadow-[0_2px_12px_rgba(210,255,0,0.15)]'
                      : 'bg-[#121212] text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-white'
                  }`}
                >
                  <DialectIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{d.name}</span>
                  <span className="text-[10px] opacity-70">[{d.code}]</span>
                </button>
              );
            })}
          </div>

          {/* Dialect Code Frame & Spec Breakdown */}
          <div className="w-full border border-neutral-800 bg-[#0c0c0c] rounded-none grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-neutral-800 overflow-hidden">
            {/* Left: Engine Details */}
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-[#0c0c0c]">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800 font-mono text-xs text-neutral-500">
                  <span className="px-2 py-0.5 bg-[#D2FF00] text-black font-bold text-[10px] uppercase">
                    {selectedDialect.code} {'//'} {selectedDialect.version}
                  </span>
                  <span className="text-[#D2FF00] font-bold">100% SPEC COMPLIANT</span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 border border-neutral-800 bg-[#161616] flex items-center justify-center shrink-0">
                    <SelectedDialectIcon className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-white">
                    {selectedDialect.name}
                  </h3>
                </div>

                <p className="text-sm text-neutral-400 font-sans leading-relaxed mb-6">
                  {selectedDialect.description}
                </p>

                <div className="space-y-2.5 font-mono text-xs">
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                    VERIFIED COMPILER CAPABILITIES:
                  </div>
                  {selectedDialect.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2 text-neutral-300">
                      <Check className="w-3.5 h-3.5 text-[#D2FF00] shrink-0 mt-0.5" />
                      <span className="text-[11px] font-sans">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-800">
                <Link
                  href={`/app?dialect=${selectedDialect.id}`}
                  className="font-mono text-xs font-bold uppercase text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors group"
                >
                  <span>Launch studio targeting {selectedDialect.name}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D2FF00] group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Right: Syntax-Highlighted Emitted Code */}
            <div className="lg:col-span-7 flex flex-col justify-between bg-[#050505] text-white">
              <div className="border-b border-neutral-800 px-4 py-2.5 flex items-center justify-between font-mono text-xs text-neutral-400">
                <div className="flex items-center gap-2">
                  <SelectedDialectIcon className="w-3.5 h-3.5 text-[#D2FF00]" />
                  <span className="text-white font-bold">emitted_{selectedDialect.id}.sql</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="hover:text-white flex items-center gap-1 text-[11px] uppercase tracking-wider transition-colors px-2 py-0.5 border border-neutral-800 bg-[#121212]"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-[#D2FF00]" />
                      <span className="text-[#D2FF00]">COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-neutral-400" />
                      <span>COPY CODE</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-5 font-mono text-xs leading-relaxed overflow-x-auto text-neutral-200 flex-1 flex items-center">
                <pre className="w-full text-neutral-300">{selectedDialect.sampleCode}</pre>
              </div>

              <div className="border-t border-neutral-800 p-3 bg-[#0a0a0a] flex items-center justify-between font-mono text-[11px] text-neutral-400">
                <span>Deterministic Compiler Output</span>
                <span className="text-[#D2FF00] font-bold">ZERO SYNTAX DRIFT</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Verified Performance Benchmarks */}
      <div id="benchmarks" className="border-b border-neutral-800 bg-black">
        <div className="border-b border-neutral-800 px-4 sm:px-6 lg:px-8 py-14 sm:py-16 bg-black">
          <div className="max-w-[1240px] mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs sm:text-[13px] font-semibold tracking-[0.2em] uppercase text-[#D2FF00] mb-3">
                MEASURED PERFORMANCE // REAL-WORLD BENCHMARKS
              </p>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                Tested against real-world production complexity.
              </h2>
            </div>
            <div className="font-mono text-xs text-neutral-500 shrink-0">
              Tested on 47-Table E-Commerce Schema
            </div>
          </div>
        </div>

        {/* 4 Stat Columns Framed in Dark Graphite */}
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-neutral-800 border border-neutral-800 rounded-none bg-[#0c0c0c]">
            {BENCHMARKS.map((b) => {
              const BenchmarkIcon = b.icon;
              return (
                <div key={b.label} className="p-6 sm:p-8 flex flex-col justify-between hover:bg-[#111111] transition-colors">
                  <div>
                    <div className="w-9 h-9 border border-neutral-800 bg-[#161616] flex items-center justify-center mb-4">
                      <BenchmarkIcon className="w-4 h-4 text-[#D2FF00]" />
                    </div>
                    <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-white mb-2">
                      {b.stat}
                    </div>
                    <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#D2FF00] mb-3">
                      {b.label}
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

        {/* Framing the Pipeline Architecture Schematic in Dark Aesthetic */}
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16">
          <div className="border border-neutral-800 bg-[#0c0c0c] rounded-none overflow-hidden">
            <div className="border-b border-neutral-800 px-4 py-3 bg-[#0a0a0a] flex items-center justify-between font-mono text-xs text-neutral-400">
              <span className="font-bold uppercase text-white">COMPILER ARCHITECTURAL PIPELINE</span>
              <span className="text-[#D2FF00]">AST IN-MEMORY LIFECYCLE</span>
            </div>
            <div className="p-6 sm:p-10 bg-[#050505] flex flex-col items-center justify-center">
              <img
                src="/diagrams/ast-pipeline.jpg"
                alt="JayVis AST In-Memory Compilation Pipeline"
                className="w-full h-auto object-contain max-h-[380px] block mx-auto invert hue-rotate-180 brightness-90 contrast-125"
              />
            </div>
            <div className="border-t border-neutral-800 p-3.5 bg-[#0a0a0a] flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-neutral-400">
              <span>Input: Declarative DBML or SQL DDL</span>
              <span className="font-bold text-[#D2FF00] uppercase">Zero Remote Server Calls</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
