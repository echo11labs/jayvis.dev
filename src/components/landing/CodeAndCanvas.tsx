'use client';

import React from 'react';
import Image from 'next/image';
import { FileCode2, Network, RefreshCw } from 'lucide-react';

export function CodeAndCanvas() {
  return (
    <section
      id="code-and-canvas"
      aria-label="Two views, one schema"
      className="relative w-full bg-[#050507] text-white border-t border-neutral-800/80 pt-24 sm:pt-32 pb-24 sm:pb-36 select-none overflow-hidden"
    >
      {/* Subtle ambient spotlight */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[700px] h-[450px] bg-[radial-gradient(ellipse_at_center,rgba(210,255,0,0.03),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Explanatory Copy */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#D2FF00]" />
              <p className="font-mono text-xs sm:text-[13px] font-semibold tracking-[0.2em] uppercase text-[#D2FF00]">
                TWO VIEWS. ONE SCHEMA.
              </p>
            </div>

            {/* Section Headline */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.1] text-balance">
              Think in code.
              <br />
              See the connections.
            </h2>

            {/* Supporting Statement */}
            <p className="mt-5 text-base sm:text-lg text-neutral-400 font-normal leading-relaxed text-balance">
              Use DBML when you want precision. Explore the diagram when you need perspective. Keep both views side by side to understand the structure behind your schema.
            </p>

            {/* Clean Feature Points - Spacious, no clutter */}
            <div className="mt-10 sm:mt-12 space-y-8 border-t border-neutral-800/80 pt-8">
              {/* Point 1 */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D2FF00]" aria-hidden="true" />
                  <span>Code for the details.</span>
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed pl-4">
                  Define tables, columns, indexes, and constraints with concise, human-readable DBML syntax.
                </p>
              </div>

              {/* Point 2 */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" aria-hidden="true" />
                  <span>A board for the bigger picture.</span>
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed pl-4">
                  Inspect foreign key relationships and follow data flow across your entire architecture on an auto-layout canvas.
                </p>
              </div>

              {/* Point 3 */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D2FF00]" aria-hidden="true" />
                  <span>Continuous bilateral sync.</span>
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed pl-4">
                  Adjust handles or reposition tables visually—the underlying code and AST update instantaneously in closed-loop synchronization.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Graphic - Generous breathing room, free-standing */}
          <div className="lg:col-span-7">
            <div className="group relative aspect-[16/10] rounded-2xl overflow-hidden border border-neutral-800/80 bg-[#09090e] shadow-2xl hover:border-[#D2FF00]/50 transition-all duration-500">
              <Image
                src="/images/illustrations/two-views-one-schema.jpg"
                alt="Two Views One Schema: Synchronized Code Editor and ERD Board"
                fill
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-700"
                priority
              />
              {/* Subtle edge vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
