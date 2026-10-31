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
} from 'lucide-react';

export function EditorialCapabilities() {
  return (
    <section id="capabilities" className="w-full bg-black text-white border-t border-neutral-800/80 select-none">
      {/* Section Header Band */}
      <div className="border-b border-neutral-800 px-4 sm:px-6 lg:px-8 py-16 sm:py-20 bg-black">
        <div className="max-w-[1240px] mx-auto">
          {/* Eyebrow - Pure typography, no badge container */}
          <p className="font-mono text-xs sm:text-[13px] font-semibold tracking-[0.2em] uppercase text-[#D2FF00] mb-3">
            STUDIO CAPABILITIES // CORE PRIMITIVES
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
            <div className="lg:col-span-8">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Engineered for speed, complexity &amp; rigor.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-neutral-400 max-w-2xl font-sans leading-relaxed">
                Every feature in JayVis is designed for professional software engineers who need architectural precision without clunky UI overhead or security risks.
              </p>
            </div>
            <div className="lg:col-span-4 flex lg:justify-end">
              <Link
                href="/app"
                className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-300 hover:text-white inline-flex items-center gap-1.5 transition-colors group"
              >
                <span>Explore all primitives in studio</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D2FF00] group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Bento Grid */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Bidirectional AST Sync (Spans 2 columns on large screens) */}
          <div className="md:col-span-2 border border-neutral-800 bg-[#0c0c0c] p-6 sm:p-8 flex flex-col justify-between hover:border-neutral-700 transition-colors group">
            <div>
              <div className="flex items-center justify-between font-mono text-xs text-neutral-500 mb-4 pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2 text-white font-bold uppercase">
                  <GitMerge className="w-4 h-4 text-[#D2FF00]" />
                  <span>01 // AST CORE</span>
                </div>
                <span className="text-[#D2FF00]">&lt; 15MS SYNC LATENCY</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-white mb-3">
                Bidirectional Code ↔ Canvas Sync
              </h3>
              <p className="text-sm text-neutral-400 font-sans leading-relaxed max-w-xl mb-6">
                The Abstract Syntax Tree (AST) is the definitive single source of truth. Edit DBML or SQL in the CodeMirror editor, and your ER diagram updates synchronously. Drag tables, create handles, or edit fields on the canvas, and code serializes cleanly back to your file.
              </p>

              {/* Code / Visual preview snippet */}
              <div className="border border-neutral-800 bg-[#050505] p-4 font-mono text-xs text-neutral-300 rounded-none overflow-x-auto">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2 flex items-center justify-between border-b border-neutral-800 pb-1">
                  <span>DECLARATIVE DBML SOURCE</span>
                  <span className="text-[#D2FF00] font-bold">SYNCHRONIZED AST</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div><span className="text-[#D2FF00]">Table</span> <span className="text-white font-bold">orders</span> {'{'}</div>
                  <div className="pl-4 text-neutral-300">id <span className="text-neutral-400">uuid</span> <span className="text-[#D2FF00]">[pk]</span></div>
                  <div className="pl-4 text-neutral-300">user_id <span className="text-neutral-400">uuid</span> <span className="text-[#D2FF00]">[ref: &gt; users.id]</span> <span className="text-neutral-500">{'// Instant Edge Drawn'}</span></div>
                  <div className="pl-4 text-neutral-300">total_cents <span className="text-neutral-400">integer</span></div>
                  <div>{'}'}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between font-mono text-[11px] text-neutral-500">
              <span>ZERO DRIFT COMPILATION</span>
              <span className="font-bold text-[#D2FF00] uppercase group-hover:underline">Instant AST Updates →</span>
            </div>
          </div>

          {/* Card 2: Multi-Dialect Code Editor & Formatter */}
          <div className="border border-neutral-800 bg-[#0c0c0c] p-6 sm:p-8 flex flex-col justify-between hover:border-neutral-700 transition-colors group">
            <div>
              <div className="flex items-center justify-between font-mono text-xs text-neutral-500 mb-4 pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2 text-white font-bold uppercase">
                  <Code2 className="w-4 h-4 text-[#D2FF00]" />
                  <span>02 // EDITOR</span>
                </div>
                <span>⌥⇧F FORMAT</span>
              </div>

              <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-3">
                Multi-Dialect Code Editor &amp; Formatter
              </h3>
              <p className="text-sm text-neutral-400 font-sans leading-relaxed mb-4">
                CodeMirror 6 compartments dynamically detect DBML, SQL, and JSON documents. Built-in code formatter (<kbd className="font-mono text-xs bg-neutral-900 px-1 border border-neutral-700 text-neutral-200">⌥⇧F</kbd>) ensures standardized casing, spacing, and AST structure.
              </p>

              <div className="p-3 border border-neutral-800 bg-[#050505] font-mono text-xs space-y-1.5 text-neutral-300">
                <div className="flex justify-between items-center text-[10px] text-neutral-500 uppercase">
                  <span>SUPPORTED MODES</span>
                  <span className="text-[#D2FF00] font-bold">LIVE COMPARTMENTS</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="px-1.5 py-0.5 bg-[#D2FF00] text-black text-[10px] font-bold">DBML</span>
                  <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-200 text-[10px] font-bold">SQL DDL</span>
                  <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-200 text-[10px] font-bold">JSON AST</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800 font-mono text-[11px] text-neutral-500 flex justify-between items-center">
              <span>Lezer Incremental Tokenizer</span>
              <span className="font-bold text-[#D2FF00] uppercase group-hover:underline">Test Editor →</span>
            </div>
          </div>

          {/* Card 3: Constraint-Aware Mock Seeder */}
          <div className="border border-neutral-800 bg-[#0c0c0c] p-6 sm:p-8 flex flex-col justify-between hover:border-neutral-700 transition-colors group">
            <div>
              <div className="flex items-center justify-between font-mono text-xs text-neutral-500 mb-4 pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2 text-white font-bold uppercase">
                  <Sparkles className="w-4 h-4 text-[#D2FF00]" />
                  <span>03 // SEED DATA</span>
                </div>
                <span>TOPOLOGICAL SORT</span>
              </div>

              <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-3">
                Constraint-Aware Mock Seeder
              </h3>
              <p className="text-sm text-neutral-400 font-sans leading-relaxed mb-4">
                Generates realistic test data respecting foreign-key hierarchy. Child records automatically inherit generated primary keys from parent tables—guaranteeing zero foreign key constraint violations.
              </p>

              <div className="p-3 border border-neutral-800 bg-[#050505] font-mono text-xs space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-500">Volume</span>
                  <span className="font-bold text-white">5, 10, or 25 rows/table</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-500">Semantics</span>
                  <span className="font-bold text-white">Names, Emails, Dates, UUIDs</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-500">Integrity</span>
                  <span className="font-bold text-[#D2FF00]">Parent PK Inheritance</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800 font-mono text-[11px] text-neutral-500 flex justify-between items-center">
              <span>PRAGMA foreign_keys = ON</span>
              <span className="font-bold text-[#D2FF00] uppercase group-hover:underline">Seed Data →</span>
            </div>
          </div>

          {/* Card 4: In-Studio SQL Query Runner */}
          <div className="border border-neutral-800 bg-[#0c0c0c] p-6 sm:p-8 flex flex-col justify-between hover:border-neutral-700 transition-colors group">
            <div>
              <div className="flex items-center justify-between font-mono text-xs text-neutral-500 mb-4 pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2 text-white font-bold uppercase">
                  <Database className="w-4 h-4 text-[#D2FF00]" />
                  <span>04 // SQL STUDIO</span>
                </div>
                <span>TABULAR RUNNER</span>
              </div>

              <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-3">
                In-Studio SQL Query Runner
              </h3>
              <p className="text-sm text-neutral-400 font-sans leading-relaxed mb-4">
                Execute SELECT, INSERT, or DDL statements directly in your studio. Inspect real column headers, measure execution duration (ms), inspect row counts, and export tabular data to CSV.
              </p>

              <div className="p-3 border border-neutral-800 bg-[#050505] font-mono text-xs space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-500">Execution Time</span>
                  <span className="font-bold text-white">&lt; 5ms Local SQLite</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-500">Export</span>
                  <span className="font-bold text-white">Tabular Grid &amp; CSV</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-500">Safety Guard</span>
                  <span className="font-bold text-[#D2FF00]">Local Gated Endpoints</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800 font-mono text-[11px] text-neutral-500 flex justify-between items-center">
              <span>SQLite &amp; PostgreSQL Ready</span>
              <span className="font-bold text-[#D2FF00] uppercase group-hover:underline">Run Queries →</span>
            </div>
          </div>

          {/* Card 5: Interactive Relationship Badges */}
          <div className="border border-neutral-800 bg-[#0c0c0c] p-6 sm:p-8 flex flex-col justify-between hover:border-neutral-700 transition-colors group">
            <div>
              <div className="flex items-center justify-between font-mono text-xs text-neutral-500 mb-4 pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2 text-white font-bold uppercase">
                  <Network className="w-4 h-4 text-[#D2FF00]" />
                  <span>05 // CANVAS EDGES</span>
                </div>
                <span>ONE-CLICK POPOVER</span>
              </div>

              <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-3">
                Interactive Relationship Badges
              </h3>
              <p className="text-sm text-neutral-400 font-sans leading-relaxed mb-4">
                No need to manually edit syntax. Click any cardinality badge directly on the canvas (<span className="font-mono text-xs font-bold text-[#D2FF00]">1:*</span>, <span className="font-mono text-xs font-bold text-[#D2FF00]">*:1</span>, <span className="font-mono text-xs font-bold text-[#D2FF00]">1:1</span>) to invert directions or set <span className="font-mono text-xs text-neutral-300">ON DELETE CASCADE</span> actions.
              </p>

              <div className="p-3 border border-neutral-800 bg-[#050505] font-mono text-xs space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-500">Cardinality</span>
                  <span className="font-bold text-white">1:N · N:1 · 1:1 · N:M</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-500">Referential Action</span>
                  <span className="font-bold text-white">CASCADE · SET NULL</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-500">Propagation</span>
                  <span className="font-bold text-[#D2FF00]">Immediate AST Patch</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800 font-mono text-[11px] text-neutral-500 flex justify-between items-center">
              <span>Orthogonal ELK Routing</span>
              <span className="font-bold text-[#D2FF00] uppercase group-hover:underline">Explore Canvas →</span>
            </div>
          </div>

          {/* Card 6: Stdio Model Context Protocol (MCP) */}
          <div className="border border-neutral-800 bg-[#0c0c0c] p-6 sm:p-8 flex flex-col justify-between hover:border-neutral-700 transition-colors group">
            <div>
              <div className="flex items-center justify-between font-mono text-xs text-neutral-500 mb-4 pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2 text-white font-bold uppercase">
                  <Cpu className="w-4 h-4 text-[#D2FF00]" />
                  <span>06 // AI AGENTS</span>
                </div>
                <span>STDIO MCP SERVER</span>
              </div>

              <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-3">
                Agent Protocol Native (MCP)
              </h3>
              <p className="text-sm text-neutral-400 font-sans leading-relaxed mb-4">
                Connect Claude Desktop, Cursor, or Gemini directly to your database design via standard Model Context Protocol. AI assistants can read schemas, validate foreign keys, and suggest optimal column indexing without third-party cloud leakage.
              </p>

              <div className="p-3 border border-neutral-800 bg-[#050505] font-mono text-xs space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-500">Interface</span>
                  <span className="font-bold text-white">Local Unix Stdio Pipe</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-500">Compatible Clients</span>
                  <span className="font-bold text-white">Claude · Cursor · Gemini</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-500">Privacy</span>
                  <span className="font-bold text-[#D2FF00]">Zero Cloud Relays</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800 font-mono text-[11px] text-neutral-500 flex justify-between items-center">
              <span>Standard MCP Tools</span>
              <span className="font-bold text-[#D2FF00] uppercase group-hover:underline">View MCP Spec →</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
