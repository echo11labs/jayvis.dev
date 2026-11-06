'use client';

import React from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { StudioPreview } from './StudioPreview';

export function EditorialHero() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  };

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
        <motion.div
          animate={{
            opacity: [0.6, 0.9, 0.6],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-[radial-gradient(ellipse_at_top,rgba(210,255,0,0.12),transparent_70%)] blur-3xl"
        />
      </div>

      <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Upper Hero Content Stack */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center text-center max-w-5xl mx-auto"
        >
          {/* Eyebrow */}
          <motion.div variants={itemVariants} className="mb-4 sm:mb-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-900/80 border border-neutral-800 text-[#D2FF00] font-mono text-xs sm:text-[13px] font-semibold tracking-[0.2em] uppercase backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D2FF00] animate-pulse" />
              DATABASE SCHEMA STUDIO
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-3xl sm:text-5xl md:text-6xl lg:text-[70px] font-extrabold tracking-tight text-white leading-tight sm:whitespace-nowrap"
          >
            Your database. By design.
          </motion.h1>

          {/* Supporting Statement */}
          <motion.p
            variants={itemVariants}
            className="mt-5 text-base sm:text-lg lg:text-xl text-neutral-400 font-normal leading-relaxed max-w-2xl text-balance"
          >
            Design database schemas in DBML and explore them visually. Validate relationships, review migration changes, and export your next build—all in one workspace.
          </motion.p>

          {/* Call to Action Group */}
          <motion.div
            variants={itemVariants}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto"
          >
            {/* Primary CTA */}
            <motion.div whileHover={{ scale: 1.025 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/app"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-none bg-[#D2FF00] hover:bg-[#e0ff33] active:bg-[#bce600] text-black text-sm font-extrabold tracking-wide transition-all shadow-[0_0_25px_rgba(210,255,0,0.3)] hover:shadow-[0_0_35px_rgba(210,255,0,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2FF00] focus-visible:ring-offset-2 focus-visible:ring-offset-black group"
              >
                <span>Open Playground</span>
                <span className="text-black group-hover:translate-x-0.5 transition-transform" aria-hidden="true">→</span>
              </Link>
            </motion.div>

            {/* Secondary CTA */}
            <motion.div whileHover={{ scale: 1.025 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/app?sample=ecommerce"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-none bg-neutral-900/90 hover:bg-neutral-800 active:bg-neutral-950 text-white border border-neutral-700 hover:border-neutral-500 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <span>Explore a sample</span>
              </Link>
            </motion.div>
          </motion.div>

          {/* Compact Capability Row */}
          <motion.div
            variants={itemVariants}
            className="mt-6 flex items-center justify-center gap-2.5 font-mono text-xs sm:text-[13px] text-neutral-400"
          >
            <span>DBML + ER diagrams</span>
            <span className="text-[#D2FF00]/80" aria-hidden="true">·</span>
            <span>Schema validation</span>
            <span className="text-[#D2FF00]/80" aria-hidden="true">·</span>
            <span>SQL &amp; Prisma exports</span>
          </motion.div>
        </motion.div>

        {/* Prominent Product Preview Area with Entrance Motion */}
        <motion.div
          initial={{ opacity: 0, y: 36, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 sm:mt-16 lg:mt-20"
        >
          <StudioPreview />
        </motion.div>
      </div>
    </section>
  );
}
