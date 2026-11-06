'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { ImageReveal } from './ImageReveal';
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
  const systemVariants: Variants = {
    hidden: { opacity: 0, y: 32 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section 
      id="capabilities" 
      aria-label="Playground capabilities"
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
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-[radial-gradient(ellipse_at_center,rgba(210,255,0,0.03),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ── Section Header with Framer Motion ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mb-20 sm:mb-28"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#D2FF00] animate-pulse" />
            <p className="font-mono text-xs sm:text-[13px] font-semibold tracking-[0.2em] uppercase text-[#D2FF00]">
              STUDIO CAPABILITIES // CORE ARCHITECTURE
            </p>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Engineered for speed, complexity &amp; rigor.
          </h2>

          <p className="mt-4 text-base sm:text-lg text-neutral-400 font-normal leading-relaxed text-balance">
            Three tightly integrated engineering systems designed for software architects who need mathematical precision without clunky UI overhead, cloud telemetry, or vendor lock-in.
          </p>
        </motion.div>

        {/* ── 3 Expansive Architectural Systems ── */}
        <div className="space-y-24 sm:space-y-32 lg:space-y-36">

          {/* ══════════════════════════════════════════════════════════════════
              SYSTEM 01: THE REACTIVE AST ENGINE
              ══════════════════════════════════════════════════════════════════ */}
          <motion.div
            variants={systemVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center"
          >
            {/* Visual Graphic */}
            <div className="lg:col-span-7 order-2 lg:order-1 flex items-center justify-center">
              <ImageReveal delay={0.1} duration={0.9} parallaxOffset={16} className="w-full">
                <div className="relative aspect-[16/9] w-full group cursor-pointer">
                  <Image
                    src="/images/illustrations/capability-ast-sync.jpg"
                    alt="System 01: Bidirectional AST Compiler & Parser Engine"
                    fill
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    className="object-contain object-center [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,#000_50%,transparent_95%)] group-hover:scale-[1.02] transition-transform duration-500"
                    priority
                  />
                </div>
              </ImageReveal>
            </div>

            {/* Content & Specs */}
            <div className="lg:col-span-5 order-1 lg:order-2 flex flex-col justify-center">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-6">
                <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#D2FF00]">
                  SYSTEM 01 // REACTIVE AST
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#D2FF00]/10 text-[#D2FF00] font-mono text-[10px] font-bold uppercase tracking-wider border border-[#D2FF00]/25">
                  &lt; 15ms latency
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug mb-4">
                Bidirectional Code ↔ Canvas Synchronization
              </h3>

              <p className="text-sm sm:text-base text-neutral-400 leading-relaxed mb-8">
                The Abstract Syntax Tree is the absolute single source of truth. Edit DBML or imported SQL DDL in the editor, and the visual ERD layout updates in lockstep. Drag tables or adjust handles on the canvas, and code serializes cleanly back to your file with zero compile drift.
              </p>

              {/* Sub-Capabilities */}
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded bg-neutral-900 border border-neutral-800 text-[#D2FF00] shrink-0 mt-0.5">
                    <GitMerge className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">
                      Deterministic Closed-Loop Loop
                    </h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Instant bilateral serialization ensures neither code nor diagram can ever fall out of sync.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded bg-neutral-900 border border-neutral-800 text-[#D2FF00] shrink-0 mt-0.5">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">
                      Multi-Dialect CodeMirror 6 Editor
                    </h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Dynamic language compartments for DBML 2.6, PostgreSQL, and SQLite, with standardized formatting (<kbd className="font-mono text-[11px] bg-neutral-800 px-1 py-0.5 rounded border border-neutral-700 text-neutral-200">⌥⇧F</kbd>).
                    </p>
                  </div>
                </div>
              </div>

              {/* Technical Spec Tags */}
              <div className="flex flex-wrap gap-2 pt-6 border-t border-neutral-800/80 font-mono text-[11px]">
                <span className="px-2.5 py-1 rounded bg-neutral-900/90 border border-neutral-800/80 text-neutral-300">
                  Lezer Incremental Tokenizer
                </span>
                <span className="px-2.5 py-1 rounded bg-neutral-900/90 border border-neutral-800/80 text-neutral-300">
                  Zero Drift
                </span>
                <span className="px-2.5 py-1 rounded bg-[#D2FF00]/10 border border-[#D2FF00]/30 text-[#D2FF00] font-semibold">
                  Bilateral Active
                </span>
              </div>
            </div>
          </motion.div>

          {/* ══════════════════════════════════════════════════════════════════
              SYSTEM 02: IN-BROWSER DATA & VERIFICATION STUDIO
              ══════════════════════════════════════════════════════════════════ */}
          <motion.div
            variants={systemVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center"
          >
            {/* Content & Specs */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-6">
                <span className="font-mono text-xs font-semibold uppercase tracking-widest text-emerald-400">
                  SYSTEM 02 // DATA ENGINE
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider border border-emerald-400/25">
                  topological sort
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug mb-4">
                Constraint-Aware Seeder &amp; SQL Playground
              </h3>

              <p className="text-sm sm:text-base text-neutral-400 leading-relaxed mb-8">
                Generate realistic test datasets that strictly honor your foreign-key hierarchy. Child rows automatically inherit generated primary keys from parent tables. Execute queries against an isolated in-memory SQLite and PGlite database without setting up external servers.
              </p>

              {/* Sub-Capabilities */}
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded bg-neutral-900 border border-neutral-800 text-emerald-400 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">
                      Relational Mock Data Synthesis
                    </h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Seed 5, 10, or 25 rows per table with semantic names, emails, dates, and UUIDs. Zero foreign-key constraint violations guaranteed.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded bg-neutral-900 border border-neutral-800 text-emerald-400 shrink-0 mt-0.5">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">
                      Tabular Query Runner with CSV Export
                    </h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Execute SELECT, INSERT, and ALTER statements with millisecond execution timing, live row inspection, and instant CSV downloads.
                    </p>
                  </div>
                </div>
              </div>

              {/* Technical Spec Tags */}
              <div className="flex flex-wrap gap-2 pt-6 border-t border-neutral-800/80 font-mono text-[11px]">
                <span className="px-2.5 py-1 rounded bg-neutral-900/90 border border-neutral-800/80 text-neutral-300">
                  PRAGMA foreign_keys = ON
                </span>
                <span className="px-2.5 py-1 rounded bg-neutral-900/90 border border-neutral-800/80 text-neutral-300">
                  &lt; 5ms Local SQLite
                </span>
                <span className="px-2.5 py-1 rounded bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 font-semibold">
                  100% Validated
                </span>
              </div>
            </div>

            {/* Visual Graphic */}
            <div className="lg:col-span-7 flex items-center justify-center">
              <ImageReveal delay={0.1} duration={0.9} parallaxOffset={16} className="w-full">
                <div className="relative aspect-[16/9] w-full group cursor-pointer">
                  <Image
                    src="/images/illustrations/capability-sql-seeder.jpg"
                    alt="System 02: Local Database Engine & Constraint Seeder"
                    fill
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    className="object-contain object-center [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,#000_50%,transparent_95%)] group-hover:scale-[1.02] transition-transform duration-500"
                  />
                </div>
              </ImageReveal>
            </div>
          </motion.div>

          {/* ══════════════════════════════════════════════════════════════════
              SYSTEM 03: AUTONOMOUS AGENT MESH & CANVAS INTELLIGENCE
              ══════════════════════════════════════════════════════════════════ */}
          <motion.div
            variants={systemVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center"
          >
            {/* Visual Graphic */}
            <div className="lg:col-span-7 order-2 lg:order-1 flex items-center justify-center">
              <ImageReveal delay={0.1} duration={0.9} parallaxOffset={16} className="w-full">
                <div className="relative aspect-[16/9] w-full group cursor-pointer">
                  <Image
                    src="/images/illustrations/capability-agent-mcp.jpg"
                    alt="System 03: AI Agent Protocol & Local Stdio Pipe"
                    fill
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    className="object-contain object-center [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,#000_50%,transparent_95%)] group-hover:scale-[1.02] transition-transform duration-500"
                  />
                </div>
              </ImageReveal>
            </div>

            {/* Content & Specs */}
            <div className="lg:col-span-5 order-1 lg:order-2 flex flex-col justify-center">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-6">
                <span className="font-mono text-xs font-semibold uppercase tracking-widest text-sky-400">
                  SYSTEM 03 // AGENT &amp; CANVAS
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-400/10 text-sky-400 font-mono text-[10px] font-bold uppercase tracking-wider border border-sky-400/25">
                  stdio mcp server
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug mb-4">
                Agent Protocol Native (MCP) &amp; Visual Refactoring
              </h3>

              <p className="text-sm sm:text-base text-neutral-400 leading-relaxed mb-8">
                Connect Claude Desktop, Cursor, or Gemini directly to your database schema via standard Model Context Protocol. AI assistants can inspect relationships and propose migrations over private local stdio pipes without transmitting schema details to external cloud relays.
              </p>

              {/* Sub-Capabilities */}
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded bg-neutral-900 border border-neutral-800 text-sky-400 shrink-0 mt-0.5">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">
                      Air-Gapped Unix Stdio Pipe
                    </h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Standard JSON-RPC 2.0 tool endpoints allow local AI agents to validate foreign keys and suggest indexing optimizations locally.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded bg-neutral-900 border border-neutral-800 text-sky-400 shrink-0 mt-0.5">
                    <Network className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">
                      Interactive Visual Cardinality Handles
                    </h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Click any edge badge directly on the canvas to invert 1:N or 1:1 directions or toggle ON DELETE CASCADE referential actions.
                    </p>
                  </div>
                </div>
              </div>

              {/* Technical Spec Tags */}
              <div className="flex flex-wrap gap-2 pt-6 border-t border-neutral-800/80 font-mono text-[11px]">
                <span className="px-2.5 py-1 rounded bg-neutral-900/90 border border-neutral-800/80 text-neutral-300">
                  Claude · Cursor · Gemini
                </span>
                <span className="px-2.5 py-1 rounded bg-neutral-900/90 border border-neutral-800/80 text-neutral-300">
                  Orthogonal ELK Routing
                </span>
                <span className="px-2.5 py-1 rounded bg-sky-400/10 border border-sky-400/30 text-sky-400 font-semibold">
                  Zero Cloud Relays
                </span>
              </div>
            </div>
          </motion.div>

        </div>

        {/* ── Section Footer CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-24 sm:mt-32 pt-10 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
        >
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#D2FF00]" />
            <p className="font-mono text-xs text-neutral-400 uppercase tracking-wider">
              FIG 02 // THREE UNIFIED PRODUCTION ENGINES · ALL RUNNING 100% IN BROWSER
            </p>
          </div>

          <Link
            href="/app"
            className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-300 hover:text-white inline-flex items-center gap-2 transition-colors group"
          >
            <span>Launch Playground &amp; Explore All Primitives</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#D2FF00] group-hover:translate-x-1.5 transition-transform" />
          </Link>
        </motion.div>

      </div>
    </section>
  );
}
