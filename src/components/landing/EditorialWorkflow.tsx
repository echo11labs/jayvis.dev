'use client';

import React from 'react';
import Image from 'next/image';
import { motion, type Variants } from 'framer-motion';
import { ImageReveal } from './ImageReveal';

export function EditorialWorkflow() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section
      id="workflow"
      aria-label="How it works"
      className="relative w-full bg-[#050507] text-white border-t border-neutral-800/80 pt-24 sm:pt-32 pb-24 sm:pb-36 select-none overflow-hidden"
    >
      {/* Subtle schematic blueprint grid background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30" 
        aria-hidden="true"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Subtle ambient lighting */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(210,255,0,0.035),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ── Open, Breathable Section Header with Framer Motion ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mb-16 sm:mb-20"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#D2FF00] animate-pulse" />
            <p className="font-mono text-xs sm:text-[13px] font-semibold tracking-[0.2em] uppercase text-[#D2FF00]">
              HOW IT WORKS
            </p>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Write it. See it. Build on it.
          </h2>

          <p className="mt-4 text-base sm:text-lg text-neutral-400 font-normal leading-relaxed text-balance">
            Move seamlessly from raw schema definitions to visual relationship exploration and production-ready migrations—without switching tools.
          </p>
        </motion.div>

        {/* ── 3 Spacious Stages Staggered Grid ── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8"
        >
          
          {/* ── STAGE 01: DEFINE ── */}
          <motion.div variants={itemVariants} className="flex flex-col group">
            {/* Stage Indicator & Status Chip */}
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs font-semibold tracking-widest uppercase text-[#D2FF00]">
                01 / SPECIFY
              </p>
              <span className="px-2 py-0.5 rounded-full bg-[#D2FF00]/10 text-[#D2FF00] font-mono text-[10px] font-semibold uppercase tracking-wider border border-[#D2FF00]/20">
                live
              </span>
            </div>

            {/* Illustration Graphic with ImageReveal */}
            <ImageReveal delay={0.1} className="w-full">
              <div className="relative aspect-[16/10] w-full flex items-center justify-center cursor-pointer">
                <Image
                  src="/images/illustrations/workflow-define-clean.jpg"
                  alt="Define Step: DBML code and schema definition"
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-contain object-center [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,#000_45%,transparent_92%)]"
                />
              </div>
            </ImageReveal>

            {/* Copy & Details */}
            <div className="mt-6">
              <h3 className="text-xl font-bold text-white tracking-tight mb-2">
                Write the structure in DBML
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Draft tables, fields, and constraints with concise, human-readable code. Instant syntax diagnostics catch errors before they touch your database.
              </p>

              {/* Minimal feature tags */}
              <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px] text-neutral-400">
                <span className="px-2 py-0.5 rounded bg-neutral-900/90 border border-neutral-800/80">
                  Instant Autocomplete
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-900/90 border border-neutral-800/80">
                  SQL DDL Import
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-900/90 border border-neutral-800/80">
                  Multi-file
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── STAGE 02: RESOLVE ── */}
          <motion.div variants={itemVariants} className="flex flex-col group">
            {/* Stage Indicator & Status Chip */}
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs font-semibold tracking-widest uppercase text-sky-400">
                02 / EXPLORE
              </p>
              <span className="px-2 py-0.5 rounded-full bg-sky-400/10 text-sky-400 font-mono text-[10px] font-semibold uppercase tracking-wider border border-sky-400/20">
                bilateral
              </span>
            </div>

            {/* Illustration Graphic with ImageReveal */}
            <ImageReveal delay={0.2} className="w-full">
              <div className="relative aspect-[16/10] w-full flex items-center justify-center cursor-pointer">
                <Image
                  src="/images/illustrations/workflow-resolve-clean.jpg"
                  alt="Resolve Step: Interactive ERD visual canvas"
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-contain object-center [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,#000_45%,transparent_92%)]"
                />
              </div>
            </ImageReveal>

            {/* Copy & Details */}
            <div className="mt-6">
              <h3 className="text-xl font-bold text-white tracking-tight mb-2">
                See how everything connects
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Automatic ELK layout maps your tables into an interactive ERD canvas. Move nodes or drag connections visually—code stays in continuous bilateral sync.
              </p>

              {/* Minimal feature tags */}
              <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px] text-neutral-400">
                <span className="px-2 py-0.5 rounded bg-neutral-900/90 border border-neutral-800/80">
                  ELK Auto-Layout
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-900/90 border border-neutral-800/80">
                  Orthogonal Edges
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-900/90 border border-neutral-800/80">
                  Table Groups
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── STAGE 03: DEPLOY ── */}
          <motion.div variants={itemVariants} className="flex flex-col group">
            {/* Stage Indicator & Status Chip */}
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs font-semibold tracking-widest uppercase text-emerald-400">
                03 / DELIVER
              </p>
              <span className="px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 font-mono text-[10px] font-semibold uppercase tracking-wider border border-emerald-400/20">
                verified
              </span>
            </div>

            {/* Illustration Graphic with ImageReveal */}
            <ImageReveal delay={0.3} className="w-full">
              <div className="relative aspect-[16/10] w-full flex items-center justify-center cursor-pointer">
                <Image
                  src="/images/illustrations/workflow-deploy-clean.jpg"
                  alt="Deploy Step: Safe migration diffs and production DDL"
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-contain object-center [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,#000_45%,transparent_92%)]"
                />
              </div>
            </ImageReveal>

            {/* Copy & Details */}
            <div className="mt-6">
              <h3 className="text-xl font-bold text-white tracking-tight mb-2">
                Export verified migrations
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Review automated schema diffs before deploying. Generate safe, production-grade SQL for PostgreSQL, MySQL, and SQLite, plus realistic mock data seeds.
              </p>

              {/* Minimal feature tags */}
              <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px] text-neutral-400">
                <span className="px-2 py-0.5 rounded bg-neutral-900/90 border border-neutral-800/80">
                  Safe ALTER Scripts
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-900/90 border border-neutral-800/80">
                  Postgres / MySQL / SQLite
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-900/90 border border-neutral-800/80">
                  Mock Seeds
                </span>
              </div>
            </div>
          </motion.div>

        </motion.div>

      </div>
    </section>
  );
}
