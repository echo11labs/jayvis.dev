'use client';

import React from 'react';
import Image from 'next/image';

export function CodeAndCanvas() {
  return (
    <section
      id="code-and-canvas"
      aria-label="Two views, one schema"
      className="relative w-full bg-[#050507] text-white border-t border-neutral-800/80 pt-24 sm:pt-32 pb-24 sm:pb-36 select-none overflow-hidden"
    >
      {/* Subtle ambient spotlight centered behind the dual-view stage */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-[radial-gradient(ellipse_at_center,rgba(210,255,0,0.04),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ── Top Header: Centered & Balanced ── */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#D2FF00]" />
            <p className="font-mono text-xs sm:text-[13px] font-semibold tracking-[0.2em] uppercase text-[#D2FF00]">
              TWO VIEWS. ONE SCHEMA.
            </p>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.1] text-balance">
            Think in code. See the connections.
          </h2>

          <p className="mt-4 text-base sm:text-lg text-neutral-400 font-normal leading-relaxed text-balance max-w-2xl mx-auto">
            Use DBML when you want precision. Explore the diagram when you need perspective. Keep both views in continuous closed-loop synchronization.
          </p>
        </div>

        {/* ── Center Stage: Free-Floating Dual-View Graphic (Zero Container Box) ── */}
        <div className="relative w-full max-w-[1100px] mx-auto mb-16 sm:mb-20 flex items-center justify-center">
          <div className="group relative aspect-[16/9] sm:aspect-[21/10] w-full">
            <Image
              src="/images/illustrations/two-views-one-schema.jpg"
              alt="Two Views One Schema: Synchronized Code Editor and ERD Board"
              fill
              sizes="(max-width: 1240px) 100vw, 1100px"
              className="object-contain object-center [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,#000_50%,transparent_95%)] group-hover:scale-[1.015] transition-transform duration-700"
              priority
            />
          </div>
        </div>

        {/* ── Bottom Value Points: 3 Perfectly Balanced Columns ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 pt-12 border-t border-neutral-800/80">
          {/* Point 1 */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 font-mono text-xs text-[#D2FF00] font-semibold uppercase tracking-wider mb-2.5">
              <span>01 // PRECISION</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
              Code for the details
            </h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Define tables, fields, indexes, and constraints with concise, human-readable DBML syntax and instant diagnostic feedback.
            </p>
          </div>

          {/* Point 2 */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 font-mono text-xs text-sky-400 font-semibold uppercase tracking-wider mb-2.5">
              <span>02 // PERSPECTIVE</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
              A board for the bigger picture
            </h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Inspect foreign key relationships and follow data flow across your entire architecture on a frictionless auto-layout canvas.
            </p>
          </div>

          {/* Point 3 */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 font-mono text-xs text-[#D2FF00] font-semibold uppercase tracking-wider mb-2.5">
              <span>03 // CONVERGENCE</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
              Continuous bilateral sync
            </h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Adjust handles visually or edit definitions in code—the underlying AST updates instantaneously in closed-loop synchronization.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
