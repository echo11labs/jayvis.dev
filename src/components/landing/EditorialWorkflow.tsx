'use client';

import React from 'react';
import { Database, CheckCircle2, FileCode2, ArrowRight } from 'lucide-react';

export function EditorialWorkflow() {
  return (
    <section
      id="workflow"
      aria-label="How it works"
      className="relative w-full bg-black text-white border-t border-neutral-800/80 pt-20 sm:pt-28 pb-20 sm:pb-28 select-none"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Left-Aligned Section Header */}
        <div className="max-w-3xl">
          {/* Eyebrow - Pure typography, no badge container */}
          <p className="font-mono text-xs sm:text-[13px] font-semibold tracking-[0.2em] uppercase text-[#D2FF00] mb-3">
            HOW IT WORKS
          </p>

          {/* Section Headline */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight text-balance">
            Write it. See it. Build on it.
          </h2>

          {/* Supporting Statement */}
          <p className="mt-4 text-base sm:text-lg text-neutral-400 font-normal leading-relaxed text-balance">
            Move from schema definitions to a clear picture of your database, without switching between disconnected tools.
          </p>
        </div>

        {/* 3-Card Workflow Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 sm:mt-16">
          {/* ── CARD 01: DEFINE ── */}
          <div className="bg-[#0c0c0c] border border-neutral-800 rounded-none p-5 sm:p-6 flex flex-col justify-between hover:border-neutral-700 transition-colors">
            <div>
              {/* Step Label */}
              <div className="font-mono text-[11px] font-bold tracking-widest text-[#D2FF00] mb-4 uppercase">
                01 / DEFINE
              </div>

              {/* Visual Demonstration: Compact DBML Code Panel */}
              <div className="h-[210px] rounded-none bg-[#050505] border border-neutral-800/90 p-3.5 mb-6 flex flex-col justify-between overflow-hidden font-mono text-xs">
                {/* Code Window Header */}
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80 text-[11px] text-neutral-500">
                  <div className="flex items-center gap-1.5 text-neutral-300">
                    <FileCode2 className="w-3.5 h-3.5 text-[#D2FF00]" aria-hidden="true" />
                    <span>schema.dbml</span>
                  </div>
                  <span className="text-[10px] text-neutral-600">DBML v2.6</span>
                </div>

                {/* DBML Code Snippet with Highlighted PK */}
                <div className="py-2.5 text-[11px] leading-relaxed text-neutral-300 space-y-0.5">
                  <div>
                    <span className="text-[#D2FF00] font-semibold">Table</span> <span className="text-white font-bold">users</span> {'{'}
                  </div>
                  <div className="pl-3 flex items-center justify-between bg-[#D2FF00]/10 px-1 border-l-2 border-[#D2FF00]">
                    <span className="text-white font-medium">id uuid</span>
                    <span className="text-[#D2FF00] font-bold text-[10px]">[pk]</span>
                  </div>
                  <div className="pl-3 flex items-center justify-between text-neutral-400">
                    <span>email varchar</span>
                    <span className="text-neutral-500 text-[10px]">[unique]</span>
                  </div>
                  <div className="pl-3 text-neutral-500">
                    <span>created_at timestamp</span>
                  </div>
                  <div className="text-neutral-400">{'}'}</div>
                </div>

                {/* Footer Micro-indicator */}
                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-500">
                  <span>Ln 2, Col 12</span>
                  <span className="text-[#D2FF00] font-medium">● Syntax Valid</span>
                </div>
              </div>

              {/* Card Headline */}
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                Write the structure.
              </h3>

              {/* Card Description */}
              <p className="text-sm text-neutral-400 leading-relaxed">
                Create tables, define columns, and connect relationships in DBML. Keep your database design readable and precise.
              </p>
            </div>
          </div>

          {/* ── CARD 02: EXPLORE ── */}
          <div className="bg-[#0c0c0c] border border-neutral-800 rounded-none p-5 sm:p-6 flex flex-col justify-between hover:border-neutral-700 transition-colors">
            <div>
              {/* Step Label */}
              <div className="font-mono text-[11px] font-bold tracking-widest text-[#D2FF00] mb-4 uppercase">
                02 / EXPLORE
              </div>

              {/* Visual Demonstration: Miniature Connected Diagram */}
              <div className="h-[210px] rounded-none bg-[#050505] border border-neutral-800/90 p-3.5 mb-6 flex flex-col justify-between overflow-hidden font-mono text-xs">
                {/* Canvas Mini Header */}
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80 text-[11px] text-neutral-500">
                  <div className="flex items-center gap-1.5 text-neutral-300">
                    <Database className="w-3.5 h-3.5 text-[#D2FF00]" aria-hidden="true" />
                    <span>Visual Canvas</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 bg-neutral-900 text-neutral-400 border border-neutral-800">
                    Auto-layout
                  </span>
                </div>

                {/* Mini Connected Diagram: users -> orders */}
                <div className="py-2 flex items-center justify-between gap-2">
                  {/* Table: users */}
                  <div className="flex-1 bg-black border border-neutral-800 p-2 text-[10px]">
                    <div className="font-bold text-white pb-1 mb-1 border-b border-neutral-800 flex items-center justify-between">
                      <span>users</span>
                      <span className="w-1.5 h-1.5 bg-[#D2FF00]" />
                    </div>
                    <div className="space-y-0.5 text-neutral-300">
                      <div className="flex justify-between text-[#D2FF00]">
                        <span>id</span>
                        <span>PK</span>
                      </div>
                      <div className="text-neutral-500 truncate">email</div>
                    </div>
                  </div>

                  {/* Relationship Link */}
                  <div className="flex flex-col items-center justify-center shrink-0 px-1">
                    <span className="text-[9px] font-bold text-[#D2FF00] bg-neutral-900 px-1 border border-[#D2FF00]/40">
                      1:*
                    </span>
                    <div className="w-6 h-[1px] bg-[#D2FF00] my-1" />
                    <ArrowRight className="w-3 h-3 text-[#D2FF00]" aria-hidden="true" />
                  </div>

                  {/* Table: orders */}
                  <div className="flex-1 bg-black border border-neutral-800 p-2 text-[10px]">
                    <div className="font-bold text-white pb-1 mb-1 border-b border-neutral-800 flex items-center justify-between">
                      <span>orders</span>
                      <span className="w-1.5 h-1.5 bg-neutral-600" />
                    </div>
                    <div className="space-y-0.5 text-neutral-300">
                      <div className="flex justify-between text-neutral-400">
                        <span>id</span>
                        <span>PK</span>
                      </div>
                      <div className="flex justify-between text-[#D2FF00]">
                        <span>user_id</span>
                        <span>FK</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Indicator */}
                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-500">
                  <span>2 tables</span>
                  <span className="text-neutral-400">users.id → orders.user_id</span>
                </div>
              </div>

              {/* Card Headline */}
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                See how everything connects.
              </h3>

              {/* Card Description */}
              <p className="text-sm text-neutral-400 leading-relaxed">
                Explore tables and relationships on a visual board. Arrange your schema and inspect the details without losing the bigger picture.
              </p>
            </div>
          </div>

          {/* ── CARD 03: PREPARE ── */}
          <div className="bg-[#0c0c0c] border border-neutral-800 rounded-none p-5 sm:p-6 flex flex-col justify-between hover:border-neutral-700 transition-colors">
            <div>
              {/* Step Label */}
              <div className="font-mono text-[11px] font-bold tracking-widest text-[#D2FF00] mb-4 uppercase">
                03 / PREPARE
              </div>

              {/* Visual Demonstration: Validation + Export Preview Panel */}
              <div className="h-[210px] rounded-none bg-[#050505] border border-neutral-800/90 p-3.5 mb-6 flex flex-col justify-between overflow-hidden font-mono text-xs">
                {/* Export Tabs & Validation Status */}
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80 text-[11px]">
                  {/* SQL / Prisma Tabs */}
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 bg-neutral-800 text-white font-semibold text-[10px]">
                      SQL DDL
                    </span>
                    <span className="px-2 py-0.5 text-neutral-500 text-[10px]">
                      Prisma
                    </span>
                  </div>

                  {/* Schema Valid Badge */}
                  <div className="flex items-center gap-1 text-[10px] text-[#D2FF00]">
                    <CheckCircle2 className="w-3 h-3 text-[#D2FF00]" aria-hidden="true" />
                    <span className="font-semibold">Schema valid</span>
                  </div>
                </div>

                {/* Generated SQL DDL Script Output */}
                <div className="py-2.5 text-[11px] leading-relaxed text-neutral-300 space-y-0.5">
                  <div className="text-neutral-400">
                    <span className="text-[#D2FF00] font-semibold">CREATE TABLE</span> users (
                  </div>
                  <div className="pl-3 text-white">
                    id <span className="text-neutral-400">UUID</span> <span className="text-[#D2FF00] font-bold">PRIMARY KEY</span>,
                  </div>
                  <div className="pl-3 text-neutral-400">
                    email <span className="text-neutral-500">VARCHAR</span> <span className="text-neutral-300">UNIQUE NOT NULL</span>
                  </div>
                  <div className="text-neutral-400">);</div>
                </div>

                {/* Footer Action Tag */}
                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-500">
                  <span className="text-[#D2FF00]">Ready to deploy</span>
                  <span className="text-neutral-400">PostgreSQL DDL</span>
                </div>
              </div>

              {/* Card Headline */}
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                Turn design into deliverables.
              </h3>

              {/* Card Description */}
              <p className="text-sm text-neutral-400 leading-relaxed">
                Validate your schema, review migration changes, and export SQL or Prisma definitions for your next step.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
