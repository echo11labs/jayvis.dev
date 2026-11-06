'use client';

import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { EditorialNavbar } from '@/components/landing/EditorialNavbar';
import { EditorialHero } from '@/components/landing/EditorialHero';
import { EditorialWorkflow } from '@/components/landing/EditorialWorkflow';
import { CodeAndCanvas } from '@/components/landing/CodeAndCanvas';
import { EditorialCapabilities } from '@/components/landing/EditorialCapabilities';
import { EditorialShowcase } from '@/components/landing/EditorialShowcase';
import { EditorialFooter } from '@/components/landing/EditorialFooter';

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div className="relative min-h-screen bg-black text-white antialiased selection:bg-[#D2FF00] selection:text-black font-sans">
      {/* ── Top Viewport Scroll Progress Bar ── */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#D2FF00] via-[#38bdf8] to-[#D2FF00] origin-left z-[100] pointer-events-none"
        style={{ scaleX }}
      />

      {/* 01. Sticky Header & Utility Announcement Bar */}
      <EditorialNavbar />

      {/* 02. High-Impact Hero & Interactive Studio Preview Window */}
      <EditorialHero />

      {/* 03. From Schema to Structure Workflow */}
      <EditorialWorkflow />

      {/* 04. Code and Canvas, Together (Dual View) */}
      <CodeAndCanvas />

      {/* 05. Studio Feature Bento Grid */}
      <EditorialCapabilities />

      {/* 06. Multi-Dialect Compiler Matrix & Real-World Performance Benchmarks */}
      <EditorialShowcase />

      {/* 07. Expansive Cinematic Closing with Generative Wave Canvas */}
      <EditorialFooter />
    </div>
  );
}
