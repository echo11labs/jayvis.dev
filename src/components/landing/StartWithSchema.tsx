'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

export function StartWithSchema() {
  return (
    <section
      id="start"
      aria-label="Start with a schema"
      className="relative w-full bg-[#121212] text-white border-t border-neutral-800 py-24 sm:py-28 lg:py-32 select-none"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 lg:gap-16">
          {/* Copy Area (approx. two-thirds width) */}
          <div className="lg:w-2/3 max-w-2xl text-left">
            {/* Eyebrow - Pure typography, no badge container */}
            <p className="font-mono text-xs sm:text-[13px] font-semibold tracking-[0.2em] uppercase text-[#D2FF00] mb-4">
              YOUR NEXT DATABASE STARTS HERE
            </p>

            {/* Section Headline */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.12]">
              Give your next idea
              <br />
              a clear structure.
            </h2>

            {/* Supporting Text */}
            <p className="mt-5 text-base sm:text-lg text-neutral-400 font-normal leading-relaxed text-balance">
              Start with a sample or bring your own DBML. Explore the relationships, refine the details, and shape your next database.
            </p>
          </div>

          {/* Action Column (remaining space, aligned right on desktop, left-stacked on mobile) */}
          <div className="lg:w-1/3 flex flex-col items-start lg:items-start lg:pl-8">
            {/* Primary CTA */}
            <Link
              href="/app"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-[#D2FF00] hover:bg-[#E0FF33] text-black font-mono text-sm sm:text-base font-bold uppercase tracking-wider rounded-none transition-colors shadow-[0_4px_20px_rgba(210,255,0,0.18)]"
            >
              <span>Open Studio</span>
              <ArrowRight className="w-4 h-4 text-black" aria-hidden="true" />
            </Link>

            {/* Secondary link, placed below button, aligned to its left edge */}
            <a
              href="https://github.com/echo11labs/jayvis.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 font-mono text-xs sm:text-sm text-neutral-400 hover:text-white inline-flex items-center gap-1.5 transition-colors group"
            >
              <span>Explore the source on GitHub</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white transition-colors" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
