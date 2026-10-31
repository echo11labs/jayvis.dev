'use client';

import React from 'react';
import Link from 'next/link';
import { StudioPreview } from './StudioPreview';

export function EditorialHero() {
  return (
    <section
      id="hero"
      aria-label="Product overview"
      className="relative w-full bg-black text-white overflow-hidden border-b border-neutral-800 pt-14 sm:pt-18 lg:pt-22 pb-16 sm:pb-24 select-none"
    >
      {/* Brutalistic technical grid and restrained ambient lime glow */}
      <div
        className="absolute inset-0 pointer-events-none select-none"
        aria-hidden="true"
      >
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_35%,#000_30%,transparent_80%)]" />
        {/* Subtle brutalist lime lighting */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-[radial-gradient(ellipse_at_top,rgba(210,255,0,0.10),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Upper Hero Content Stack */}
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
          {/* Eyebrow */}
          <p className="font-mono text-xs sm:text-[13px] font-semibold tracking-[0.2em] uppercase text-[#D2FF00] mb-4 sm:mb-5">
            DATABASE SCHEMA STUDIO
          </p>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[70px] font-extrabold tracking-tight text-white leading-tight sm:whitespace-nowrap">
            Your database. By design.
          </h1>

          {/* Supporting Statement */}
          <p className="mt-5 text-base sm:text-lg lg:text-xl text-neutral-400 font-normal leading-relaxed max-w-2xl text-balance">
            Design database schemas in DBML and explore them visually. Validate relationships, review migration changes, and export your next build—all in one workspace.
          </p>

          {/* Call to Action Group */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
            {/* Primary CTA */}
            <Link
              href="/app"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-none bg-[#D2FF00] hover:bg-[#e0ff33] active:bg-[#bce600] text-black text-sm font-extrabold tracking-wide transition-all shadow-[0_0_25px_rgba(210,255,0,0.3)] hover:shadow-[0_0_35px_rgba(210,255,0,0.45)] hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2FF00] focus-visible:ring-offset-2 focus-visible:ring-offset-black group"
            >
              <span>Open Studio</span>
              <span className="text-black group-hover:translate-x-0.5 transition-transform" aria-hidden="true">→</span>
            </Link>

            {/* Secondary CTA */}
            <Link
              href="/app?sample=ecommerce"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-none bg-neutral-900/90 hover:bg-neutral-800 active:bg-neutral-950 text-white border border-neutral-700 hover:border-neutral-500 text-sm font-medium transition-all hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <span>Explore a sample</span>
            </Link>
          </div>

          {/* Compact Capability Row */}
          <div className="mt-6 flex items-center justify-center gap-2.5 font-mono text-xs sm:text-[13px] text-neutral-400">
            <span>DBML + ER diagrams</span>
            <span className="text-[#D2FF00]/80" aria-hidden="true">·</span>
            <span>Schema validation</span>
            <span className="text-[#D2FF00]/80" aria-hidden="true">·</span>
            <span>SQL &amp; Prisma exports</span>
          </div>
        </div>

        {/* Prominent Product Preview Area */}
        <div className="mt-12 sm:mt-16 lg:mt-20">
          <StudioPreview />
        </div>
      </div>
    </section>
  );
}
