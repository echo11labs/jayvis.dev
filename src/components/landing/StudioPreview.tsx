'use client';

import React from 'react';
import Image from 'next/image';
import { Database, CheckCircle2, Columns, Layers } from 'lucide-react';
import { ImageReveal } from './ImageReveal';

interface StudioPreviewProps {
  className?: string;
}

export function StudioPreview({ className = '' }: StudioPreviewProps) {
  return (
    <div className={`w-full max-w-[1240px] mx-auto select-none ${className}`}>
      {/* Studio Window Shell - Pure Brutalist Zero Border Radius */}
      <div className="rounded-none border border-neutral-800 bg-[#0a0a0a] shadow-[0_24px_70px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Titlebar Chrome */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0f0f0f] border-b border-neutral-800 font-mono text-[11px] text-neutral-400">
          {/* Window control indicators */}
          <div className="flex items-center gap-1.5 w-20" aria-hidden="true">
            <span className="w-2.5 h-2.5 bg-[#ef4444]/70 border border-[#ef4444]/40" />
            <span className="w-2.5 h-2.5 bg-[#eab308]/70 border border-[#eab308]/40" />
            <span className="w-2.5 h-2.5 bg-[#D2FF00] border border-[#b8e000] shadow-[0_0_8px_#D2FF00]" />
          </div>

          {/* Active File / Workspace Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 bg-black border border-neutral-800 text-neutral-300">
            <Database className="w-3.5 h-3.5 text-[#D2FF00]" aria-hidden="true" />
            <span className="text-white font-medium">ecommerce-db</span>
            <span className="text-neutral-600">/</span>
            <span className="text-[#D2FF00] font-semibold">schema.dbml</span>
          </div>

          {/* View Modes & Validation Indicator */}
          <div className="flex items-center gap-3">
            {/* View Mode Segmented Pill */}
            <div
              className="hidden sm:flex items-center bg-black p-0.5 border border-neutral-800 text-[10px]"
              aria-label="Playground view mode"
            >
              <span className="px-2 py-0.5 text-neutral-500">Code</span>
              <span className="px-2 py-0.5 text-neutral-500">Board</span>
              <span className="px-2 py-0.5 bg-neutral-900 text-white font-semibold border border-[#D2FF00]/40 shadow-[0_0_10px_rgba(210,255,0,0.2)]">
                Both
              </span>
            </div>

            {/* Validation Badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black border border-neutral-800 text-[10px] text-neutral-400">
              <CheckCircle2 className="w-3 h-3 text-[#D2FF00]" aria-hidden="true" />
              <span className="hidden md:inline text-neutral-300">0 errors</span>
            </div>

            {/* Engine Tag */}
            <span className="hidden lg:inline-block px-1.5 py-0.5 bg-black text-neutral-400 border border-neutral-800 text-[10px]">
              PostgreSQL
            </span>
          </div>
        </div>

        {/* Studio Viewport Image Presentation with Signature Image Reveal */}
        <ImageReveal
          delay={0.2}
          duration={0.9}
          parallaxOffset={12}
          className="w-full bg-black"
        >
          <div className="relative w-full bg-black overflow-hidden group">
            <Image
              src="/screenshots/studio-main.png"
              alt="JayVis.dev database schema playground workspace showing the DBML code editor side-by-side with the interactive ER diagram canvas"
              width={1600}
              height={913}
              priority
              sizes="(max-width: 1280px) 100vw, 1240px"
              className="w-full h-auto block select-none"
            />

            {/* Subtle bottom gradient vignette */}
            <div
              className="absolute inset-x-0 bottom-0 h-10 pointer-events-none bg-gradient-to-t from-black/50 to-transparent"
              aria-hidden="true"
            />
          </div>
        </ImageReveal>

        {/* Minimal Studio Workspace Status Bar */}
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0f0f0f] border-t border-neutral-800 font-mono text-[10px] text-neutral-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-neutral-300">
              <Columns className="w-3 h-3 text-[#D2FF00]" aria-hidden="true" />
              <span>Split Playground Mode</span>
            </span>
            <span className="text-neutral-700 hidden sm:inline">|</span>
            <span className="hidden sm:inline text-neutral-400">AST Parser: Synced</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-neutral-500">UTF-8</span>
            <span className="text-neutral-700 hidden md:inline">|</span>
            <span className="text-neutral-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-neutral-400" aria-hidden="true" />
              <span>ELK Canvas Engine</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
