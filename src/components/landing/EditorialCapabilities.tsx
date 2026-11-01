'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Code2,
  Network,
  Database,
  Cpu,
  Sparkles,
  GitMerge,
  ArrowLeftRight,
} from 'lucide-react';

export function EditorialCapabilities() {
  return (
    <section 
      id="capabilities" 
      aria-label="Studio capabilities"
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

      {/* Subtle ambient spotlight */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(210,255,0,0.025),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ── Open, Breathable Section Header ── */}
        <div className="max-w-3xl mb-16 sm:mb-20">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#D2FF00]" />
            <p className="font-mono text-xs sm:text-[13px] font-semibold tracking-[0.2em] uppercase text-[#D2FF00]">
              STUDIO CAPABILITIES // CORE PRIMITIVES
            </p>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Engineered for speed, complexity &amp; rigor.
          </h2>

          <p className="mt-4 text-base sm:text-lg text-neutral-400 font-normal leading-relaxed text-balance">
            Every primitive is built for software architects who need mathematical precision without clunky UI overhead, subscription lock-in, or security hazards.
          </p>
        </div>

        {/* ── Open Architectural Capabilities Grid (Zero Nested Boxes) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 sm:gap-14 lg:gap-16">
          
          {/* ── CAPABILITY 01: BIDIRECTIONAL SYNC ── */}
          <div className="flex flex-col justify-between group">
            <div>
              {/* Status Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-5">
                <div className="flex items-center gap-2">
                  <GitMerge className="w-4 h-4 text-[#D2FF00]" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-300">
                    01 // AST CORE
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#D2FF00]/10 text-[#D2FF00] font-mono text-[10px] font-semibold uppercase tracking-wider border border-[#D2FF00]/25">
                  &lt; 15ms sync
                </span>
              </div>

              <h3 className="text-xl font-bold tracking-tight text-white mb-2.5">
                Bidirectional Code ↔ Canvas Sync
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                The Abstract Syntax Tree is the definitive single source of truth. Edit DBML or SQL in the editor, and the diagram updates in real-time. Drag handles on the canvas, and code serializes cleanly back to your file.
              </p>
            </div>

            {/* Open Schematic Visual: No nested boxes, clean technical lines */}
            <div className="pt-4 border-t border-neutral-800/80 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-2">
                <span className="text-[#D2FF00]">Table orders</span>
                <span className="text-neutral-500">── AST Edge ──&gt;</span>
                <span className="text-white">users.id</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1">
                <span>ZERO-DRIFT SERIALIZER</span>
                <span className="text-[#D2FF00] font-semibold">BILATERAL ACTIVE</span>
              </div>
            </div>
          </div>

          {/* ── CAPABILITY 02: MULTI-DIALECT CODE EDITOR ── */}
          <div className="flex flex-col justify-between group">
            <div>
              {/* Status Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-5">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[#D2FF00]" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-300">
                    02 // CODE ENGINE
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono text-[10px] font-semibold uppercase tracking-wider border border-neutral-700">
                  ⌥⇧F format
                </span>
              </div>

              <h3 className="text-xl font-bold tracking-tight text-white mb-2.5">
                Multi-Dialect Editor &amp; Formatter
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                CodeMirror 6 compartments automatically detect DBML, SQL DDL, and JSON AST. Instant diagnostics highlight missing foreign keys, while the auto-formatter standardizes casing and indentation.
              </p>
            </div>

            {/* Open Schematic Visual: Dialect chips */}
            <div className="pt-4 border-t border-neutral-800/80 font-mono text-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-[#D2FF00] text-black font-bold text-[10px]">
                  DBML 2.6
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 text-[10px]">
                  PostgreSQL
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 text-[10px]">
                  SQLite
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 text-[10px]">
                  MySQL
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1">
                <span>LEZER INCREMENTAL PARSER</span>
                <span className="text-neutral-400">0ms lag</span>
              </div>
            </div>
          </div>

          {/* ── CAPABILITY 03: CONSTRAINT-AWARE MOCK SEEDER ── */}
          <div className="flex flex-col justify-between group">
            <div>
              {/* Status Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D2FF00]" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-300">
                    03 // SEED DATA
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 font-mono text-[10px] font-semibold uppercase tracking-wider border border-emerald-400/25">
                  topological sort
                </span>
              </div>

              <h3 className="text-xl font-bold tracking-tight text-white mb-2.5">
                Constraint-Aware Mock Seeder
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                Generates realistic test data respecting your relational schema. Child rows automatically inherit primary keys from parent records—guaranteeing zero foreign key constraint violations on insert.
              </p>
            </div>

            {/* Open Schematic Visual: Seed flow */}
            <div className="pt-4 border-t border-neutral-800/80 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-2">
                <span>Parent PK</span>
                <span className="text-emerald-400">── Inherit ──&gt;</span>
                <span className="text-white">Child FK Records</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1">
                <span>PRAGMA FOREIGN_KEYS = ON</span>
                <span className="text-emerald-400 font-semibold">100% VALIDATED</span>
              </div>
            </div>
          </div>

          {/* ── CAPABILITY 04: IN-STUDIO SQL QUERY RUNNER ── */}
          <div className="flex flex-col justify-between group">
            <div>
              {/* Status Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-5">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#D2FF00]" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-300">
                    04 // SQL ENGINE
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-sky-400/10 text-sky-400 font-mono text-[10px] font-semibold uppercase tracking-wider border border-sky-400/25">
                  in-browser sqlite
                </span>
              </div>

              <h3 className="text-xl font-bold tracking-tight text-white mb-2.5">
                In-Studio SQL Query Runner
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                Execute SELECT queries, test joins, or run ALTER statements against an isolated in-memory engine. Inspect row counts, measure execution duration down to the millisecond, and export to CSV.
              </p>
            </div>

            {/* Open Schematic Visual: Query Execution */}
            <div className="pt-4 border-t border-neutral-800/80 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-2">
                <span className="text-sky-400">SELECT * FROM orders</span>
                <span className="text-white font-semibold">1,000 rows</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1">
                <span>DURATION: 3.4MS</span>
                <span className="text-sky-400 font-semibold">TABULAR GRID &amp; CSV</span>
              </div>
            </div>
          </div>

          {/* ── CAPABILITY 05: INTERACTIVE CARDINALITY ── */}
          <div className="flex flex-col justify-between group">
            <div>
              {/* Status Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-5">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-[#D2FF00]" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-300">
                    05 // CANVAS EDGES
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#D2FF00]/10 text-[#D2FF00] font-mono text-[10px] font-semibold uppercase tracking-wider border border-[#D2FF00]/25">
                  one-click popover
                </span>
              </div>

              <h3 className="text-xl font-bold tracking-tight text-white mb-2.5">
                Interactive Relationship Controls
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                Click any connection badge directly on the visual board to switch cardinality directions (1:N, N:1, 1:1) or configure ON DELETE CASCADE referential actions with immediate code synchronization.
              </p>
            </div>

            {/* Open Schematic Visual: Cardinality badges */}
            <div className="pt-4 border-t border-neutral-800/80 font-mono text-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-[#D2FF00]/20 text-[#D2FF00] border border-[#D2FF00]/40 font-bold text-[10px]">
                  1 : *
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 text-[10px]">
                  * : 1
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 text-[10px]">
                  1 : 1
                </span>
                <span className="text-[10px] text-neutral-500 ml-auto">
                  CASCADE
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1">
                <span>ORTHOGONAL ELK ROUTING</span>
                <span className="text-[#D2FF00] font-semibold">INSTANT AST PATCH</span>
              </div>
            </div>
          </div>

          {/* ── CAPABILITY 06: AGENT PROTOCOL NATIVE (MCP) ── */}
          <div className="flex flex-col justify-between group">
            <div>
              {/* Status Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-5">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#D2FF00]" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-300">
                    06 // AGENT PROTOCOL
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400 font-mono text-[10px] font-semibold uppercase tracking-wider border border-purple-400/25">
                  stdio mcp server
                </span>
              </div>

              <h3 className="text-xl font-bold tracking-tight text-white mb-2.5">
                Agent Protocol Native (MCP)
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                Connect Claude Desktop, Cursor, or Gemini CLI directly to your schemas via Model Context Protocol. AI assistants can inspect constraints, query tables, and propose safe ALTER migrations over a private stdio pipe.
              </p>
            </div>

            {/* Open Schematic Visual: Stdio Pipe */}
            <div className="pt-4 border-t border-neutral-800/80 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-2">
                <span className="text-purple-400">Claude / Cursor</span>
                <span className="text-neutral-500">── Stdio Pipe ──&gt;</span>
                <span className="text-white">Local AST</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1">
                <span>ZERO CLOUD LEAKAGE</span>
                <span className="text-purple-400 font-semibold">AIR-GAPPED STDIN/OUT</span>
              </div>
            </div>
          </div>

        </div>

        {/* ── Bottom Link Callout ── */}
        <div className="mt-16 sm:mt-20 pt-8 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="font-mono text-xs text-neutral-500">
            FIG 02 // STUDIO ARCHITECTURE — 6 INTEGRATED CORE PRIMITIVES
          </p>

          <Link
            href="/app"
            className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-300 hover:text-white inline-flex items-center gap-2 transition-colors group"
          >
            <span>Launch Studio &amp; Explore All Primitives</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#D2FF00] group-hover:translate-x-1.5 transition-transform" />
          </Link>
        </div>

      </div>
    </section>
  );
}
