'use client';

import React from 'react';
import { Columns, Database, FileCode2 } from 'lucide-react';

export function CodeAndCanvas() {
  return (
    <section
      id="code-and-canvas"
      aria-label="Code and canvas together"
      className="relative w-full bg-black text-white border-t border-neutral-800/80 pt-20 sm:pt-28 pb-20 sm:pb-28 select-none"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Asymmetric 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Explanatory Copy (~40% width on desktop) */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            {/* Eyebrow - Pure typography, no pill/badge */}
            <p className="font-mono text-xs sm:text-[13px] font-semibold tracking-[0.2em] uppercase text-[#D2FF00] mb-3">
              TWO VIEWS. ONE SCHEMA.
            </p>

            {/* Section Headline */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.08] text-balance">
              Think in code.
              <br />
              See the connections.
            </h2>

            {/* Supporting Statement */}
            <p className="mt-4 text-base sm:text-lg text-neutral-400 font-normal leading-relaxed text-balance">
              Use DBML when you want precision. Explore the diagram when you need perspective. Keep both views side by side to understand the structure behind your schema.
            </p>

            {/* Feature Points (Separated with whitespace, no boxed cards) */}
            <div className="mt-10 sm:mt-12 space-y-7 border-t border-neutral-800/80 pt-8">
              {/* Point 1 */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#D2FF00]" aria-hidden="true" />
                  <span>Code for the details.</span>
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed pl-3.5">
                  Define tables, columns, and relationships in a readable DBML editor.
                </p>
              </div>

              {/* Point 2 */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#D2FF00]" aria-hidden="true" />
                  <span>A board for the bigger picture.</span>
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed pl-3.5">
                  Explore connected tables and follow relationships across your database.
                </p>
              </div>

              {/* Point 3 */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#D2FF00]" aria-hidden="true" />
                  <span>Your workspace, your perspective.</span>
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed pl-3.5">
                  Choose Code, Board, or Both to match the task in front of you.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Focused Editor-and-Diagram Close-Up (~60% width on desktop) */}
          <div className="lg:col-span-7">
            {/* Focused Preview Window - Zero Border Radius */}
            <div className="rounded-none border border-neutral-800 bg-[#0a0a0a] shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden">
              {/* Preview Window Header & View Mode Switch */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#0f0f0f] border-b border-neutral-800 font-mono text-xs">
                {/* Left indicators */}
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#ef4444]/70 border border-[#ef4444]/40" />
                  <span className="w-2 h-2 bg-[#eab308]/70 border border-[#eab308]/40" />
                  <span className="w-2 h-2 bg-[#D2FF00] border border-[#b8e000]" />
                  <span className="ml-2 text-neutral-400 font-medium hidden sm:inline text-[11px]">
                    ecommerce-db · dual view
                  </span>
                </div>

                {/* View Mode Switcher with "Both" Selected */}
                <div
                  className="flex items-center bg-black p-0.5 border border-neutral-800 text-[10px]"
                  aria-label="View mode switcher"
                >
                  <span className="px-2.5 py-1 text-neutral-500 font-mono">Code</span>
                  <span className="px-2.5 py-1 text-neutral-500 font-mono">Board</span>
                  <span className="px-2.5 py-1 bg-neutral-900 text-white font-mono font-bold border border-[#D2FF00]/50 shadow-[0_0_10px_rgba(210,255,0,0.2)]">
                    Both
                  </span>
                </div>
              </div>

              {/* Side-by-Side Dual View Body */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-neutral-800 bg-[#080808]">
                {/* Left Pane: DBML Code Editor Close-Up */}
                <div className="p-4 sm:p-5 flex flex-col justify-between font-mono text-xs bg-[#0a0a0a]">
                  <div>
                    {/* Pane Tab */}
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-800/80 text-[11px] text-neutral-500">
                      <div className="flex items-center gap-1.5 text-neutral-300">
                        <FileCode2 className="w-3.5 h-3.5 text-[#D2FF00]" aria-hidden="true" />
                        <span>schema.dbml</span>
                      </div>
                      <span className="text-[10px] text-neutral-600">DBML</span>
                    </div>

                    {/* DBML Code with orders.user_id Connection Highlighted */}
                    <div className="space-y-1 text-[11.5px] leading-relaxed">
                      <div className="text-neutral-500">
                        <span className="text-[#D2FF00]">Table</span> <span className="text-white">users</span> {'{'}
                      </div>
                      <div className="pl-3 flex justify-between text-neutral-400">
                        <span>id uuid</span>
                        <span className="text-neutral-600">[pk]</span>
                      </div>
                      <div className="pl-3 text-neutral-600">
                        <span>email varchar [unique]</span>
                      </div>
                      <div className="text-neutral-500">{'}'}</div>

                      <div className="pt-2 text-neutral-500">
                        <span className="text-[#D2FF00]">Table</span> <span className="text-white">orders</span> {'{'}
                      </div>
                      <div className="pl-3 flex justify-between text-neutral-400">
                        <span>id uuid</span>
                        <span className="text-neutral-600">[pk]</span>
                      </div>

                      {/* Focused Highlighted Field: orders.user_id */}
                      <div className="pl-3 -mx-1 px-1 bg-[#D2FF00]/15 border-l-2 border-[#D2FF00] flex justify-between items-center text-white font-medium">
                        <span className="text-[#D2FF00]">user_id uuid</span>
                        <span className="text-[10px] text-[#D2FF00] font-bold">[FK]</span>
                      </div>

                      <div className="pl-3 text-neutral-600">
                        <span>total integer</span>
                      </div>
                      <div className="text-neutral-500">{'}'}</div>

                      {/* Focused Highlighted Reference Statement */}
                      <div className="pt-2 text-[11px] text-[#D2FF00] bg-[#D2FF00]/10 px-1.5 py-0.5 border-l-2 border-[#D2FF00] font-bold">
                        Ref: orders.user_id &gt; users.id
                      </div>
                    </div>
                  </div>

                  {/* Editor Bottom Micro-meta */}
                  <div className="pt-3 mt-4 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-500">
                    <span>Line 9 · Column 11</span>
                    <span className="text-[#D2FF00]">Active Selection</span>
                  </div>
                </div>

                {/* Right Pane: ER Diagram Canvas Close-Up */}
                <div className="p-4 sm:p-5 flex flex-col justify-between font-mono text-xs bg-[#050505]">
                  <div>
                    {/* Pane Tab */}
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-800/80 text-[11px] text-neutral-500">
                      <div className="flex items-center gap-1.5 text-neutral-300">
                        <Database className="w-3.5 h-3.5 text-[#D2FF00]" aria-hidden="true" />
                        <span>ER Diagram Board</span>
                      </div>
                      <span className="text-[10px] text-[#D2FF00]">Auto-synced</span>
                    </div>

                    {/* Table Cards with Connecting Relationship */}
                    <div className="space-y-2 py-1">
                      {/* Table Node: users */}
                      <div className="bg-black border border-neutral-800 p-2.5 shadow-sm">
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-800 text-[11px]">
                          <span className="font-bold text-white">users</span>
                          <span className="text-[9px] text-neutral-500">source</span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between items-center text-white">
                            <span className="font-medium">id</span>
                            <span className="text-[9px] px-1 py-0.2 bg-neutral-900 border border-neutral-700 text-neutral-300">PK</span>
                          </div>
                          <div className="flex justify-between items-center text-neutral-600 text-[10px]">
                            <span>email</span>
                            <span>unique</span>
                          </div>
                        </div>
                      </div>

                      {/* Focused Relationship Connector Arrow */}
                      <div className="flex items-center justify-center gap-2 py-1">
                        <div className="h-6 w-[2px] bg-[#D2FF00] shadow-[0_0_8px_#D2FF00]" />
                        <span className="text-[10px] font-bold text-[#D2FF00] bg-black px-1.5 py-0.5 border border-[#D2FF00]/50 tracking-wider">
                          1:* (users.id &rarr; orders.user_id)
                        </span>
                        <div className="h-6 w-[2px] bg-[#D2FF00] shadow-[0_0_8px_#D2FF00]" />
                      </div>

                      {/* Table Node: orders (Highlighted Active Target) */}
                      <div className="bg-black border-2 border-[#D2FF00]/60 p-2.5 shadow-[0_0_15px_rgba(210,255,0,0.12)]">
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-800 text-[11px]">
                          <span className="font-bold text-white">orders</span>
                          <span className="text-[9px] text-[#D2FF00] font-semibold">active target</span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between items-center text-neutral-500 text-[10px]">
                            <span>id</span>
                            <span>PK</span>
                          </div>
                          {/* Focused Highlighted Foreign Key Field */}
                          <div className="flex justify-between items-center text-[#D2FF00] font-bold bg-[#D2FF00]/15 px-1 py-0.5 border border-[#D2FF00]/30">
                            <span>user_id</span>
                            <span className="text-[9px] px-1 bg-black border border-[#D2FF00] text-[#D2FF00]">FK</span>
                          </div>
                          <div className="flex justify-between items-center text-neutral-600 text-[10px]">
                            <span>total</span>
                            <span>int</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Diagram Bottom Micro-meta */}
                  <div className="pt-3 mt-4 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-500">
                    <span className="text-neutral-400">1 Relationship Selected</span>
                    <span className="text-[#D2FF00] font-semibold">Cardinality: 1:N</span>
                  </div>
                </div>
              </div>

              {/* Bottom Sync Bar */}
              <div className="px-4 py-2 bg-[#0c0c0c] border-t border-neutral-800 flex items-center justify-between font-mono text-[10px] text-neutral-400">
                <div className="flex items-center gap-2 text-neutral-300">
                  <Columns className="w-3 h-3 text-[#D2FF00]" aria-hidden="true" />
                  <span>Bidirectional AST Sync</span>
                </div>
                <div className="text-neutral-500">
                  Code changes reflect on canvas instantly
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
