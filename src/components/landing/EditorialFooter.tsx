'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useSpring, useMotionValue, type Variants } from 'framer-motion';
import { ArrowUpRight, Github, FileText, ArrowRight } from 'lucide-react';
import { JayvisBrandIcon } from './Logos';

interface LineData {
  phase: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  basePointX: number;
  baseCenterX: number;
  baseCenterY: number;
}

export function EditorialFooter() {
  const containerRef = useRef<HTMLElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const glowPathRef = useRef<SVGPathElement>(null);

  // ── Framer Motion: Scroll-driven parallax ──
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end end'],
  });

  const rawWaveY = useTransform(scrollYProgress, [0, 1], [-45, 20]);
  const waveY = useSpring(rawWaveY, { stiffness: 70, damping: 25 });
  const waveOpacity = useTransform(scrollYProgress, [0, 0.35, 1], [0.25, 0.6, 0.75]);
  const contentY = useTransform(scrollYProgress, [0, 1], [30, 0]);

  // ── Framer Motion: Mouse cursor parallax coordinates ──
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 22 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 22 });

  // Spotlights for dynamic hover feel
  const [cursorPos, setCursorPos] = useState({ x: -1000, y: -1000, visible: false });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      visible: true,
    });
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setCursorPos((prev) => ({ ...prev, visible: false }));
  };

  // ── Generative Harmonic Wave Loop with cursor distortion ──
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const numberOfLines = 26;
    const ampl = 28;

    const lineDataArr: LineData[] = [];
    for (let i = 0; i < numberOfLines; i++) {
      lineDataArr.push({
        phase: i * 0.16,
        startX: -25 - i * 0.6,
        startY: -15 + i * 1.6,
        endX: 220 + i * 0.6,
        endY: 95 + i * 1.5,
        basePointX: 42,
        baseCenterX: 108,
        baseCenterY: 64,
      });
    }

    let animId: number;
    let startTime: number | null = null;

    const renderFrame = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const t = (timestamp - startTime) * 0.00065;

      const mx = smoothMouseX.get();
      const my = smoothMouseY.get();

      let completedPath = '';
      const comma = ',';

      for (let i = 0; i < numberOfLines; i++) {
        const line = lineDataArr[i];
        const angle = t + line.phase;

        const currentX = ampl * Math.sin(angle);
        const currentY = ampl * Math.cos(angle * 0.88);

        // Responsive mouse perturbation
        const mouseInfluence = 1 - (i / numberOfLines) * 0.3;
        const mouseOffsetX = mx * 16 * mouseInfluence;
        const mouseOffsetY = my * 14 * mouseInfluence;

        const pointX = line.basePointX + Math.sin(t * 0.75 + i * 0.05) * 6 + mouseOffsetX;
        const pointY = currentY * 1.15 + mouseOffsetY;
        const centerX = line.baseCenterX + Math.cos(t * 0.85 + i * 0.06) * 9 + currentX / 10 + mouseOffsetX * 0.4;
        const centerY = line.baseCenterY + Math.sin(t * 0.65 + i * 0.04) * 5 + currentY / 5 + mouseOffsetY * 0.4;

        const pathSection =
          'M' +
          line.startX.toFixed(2) +
          comma +
          line.startY.toFixed(2) +
          ' Q' +
          pointX.toFixed(2) +
          comma +
          pointY.toFixed(2) +
          ' ' +
          centerX.toFixed(2) +
          comma +
          centerY.toFixed(2) +
          ' T' +
          line.endX.toFixed(2) +
          comma +
          line.endY.toFixed(2);

        completedPath += pathSection;
      }

      if (pathRef.current) {
        pathRef.current.setAttribute('d', completedPath);
      }
      if (glowPathRef.current) {
        glowPathRef.current.setAttribute('d', completedPath);
      }

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    if (prefersReducedMotion) {
      renderFrame(performance.now());
    } else {
      animId = requestAnimationFrame(renderFrame);
    }

    return () => {
      if (animId) {
        cancelAnimationFrame(animId);
      }
    };
  }, [smoothMouseX, smoothMouseY]);

  // Framer Motion column animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.07,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <footer
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full bg-black text-white border-t border-neutral-800/80 overflow-hidden select-none"
    >
      {/* ── Dynamic Mouse Glow Spotlight ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-700"
        style={{
          opacity: cursorPos.visible ? 1 : 0,
          background: `radial-gradient(450px circle at ${cursorPos.x}px ${cursorPos.y}px, rgba(210, 255, 0, 0.035), transparent 70%)`,
        }}
      />

      {/* ── Background: Parallax Generative Undulating Wave Lines Canvas ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          y: waveY,
          opacity: waveOpacity,
        }}
      >
        <svg
          className="w-full h-full block"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 200 120"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Luminous Neon Gradient */}
            <linearGradient id="footerWaveGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#D2FF00" stopOpacity="0.55" />
              <stop offset="42%" stopColor="#38bdf8" stopOpacity="0.38" />
              <stop offset="80%" stopColor="#ffffff" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#D2FF00" stopOpacity="0.48" />
            </linearGradient>

            {/* Ambient Vignette so foreground text stays crisp */}
            <radialGradient id="footerAmbientVignette" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.75" />
              <stop offset="65%" stopColor="#000000" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.90" />
            </radialGradient>
          </defs>

          {/* Vignette Backing */}
          <rect width="200" height="120" fill="url(#footerAmbientVignette)" />

          {/* Soft Glow Underlay */}
          <path
            ref={glowPathRef}
            fill="none"
            stroke="#D2FF00"
            strokeWidth="1.2"
            strokeOpacity="0.10"
            style={{ vectorEffect: 'non-scaling-stroke' }}
          />

          {/* Primary Silky Hairline Waves */}
          <path
            ref={pathRef}
            fill="none"
            stroke="url(#footerWaveGrad)"
            strokeWidth="0.5"
            style={{ vectorEffect: 'non-scaling-stroke' }}
          />
        </svg>
      </motion.div>

      {/* ── Foreground Footer Structure ── */}
      <motion.div
        className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-12"
        style={{ y: contentY }}
      >
        {/* Top Brand & Utility Header Row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-12 border-b border-neutral-800/70"
        >
          <div className="space-y-2">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <JayvisBrandIcon className="w-5 h-5 text-white group-hover:text-[#D2FF00] transition-colors" />
              <span className="font-sans text-xl font-bold tracking-tight text-white">
                jayvis<span className="text-[#D2FF00]">.</span>
              </span>
            </Link>
            <p className="font-mono text-xs text-neutral-400">
              Local-first relational database playground. 100% in-browser memory.
            </p>
          </div>

          {/* Quick Actions & Status */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-900/90 border border-neutral-800 text-neutral-400 font-mono text-[11px] uppercase tracking-wider backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D2FF00] animate-pulse shadow-[0_0_6px_rgba(210,255,0,0.8)]" />
              <span>Zero-Egress Sandbox</span>
            </div>

            <motion.div whileHover={{ scale: 1.025 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/app"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D2FF00] hover:bg-[#E0FF33] text-black font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-[0_2px_12px_rgba(210,255,0,0.2)]"
              >
                <span>Launch Playground</span>
                <ArrowRight className="w-3.5 h-3.5 text-black" />
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Organized 4-Column Footer Navigation Links with Stagger */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-30px' }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 font-mono text-xs"
        >
          {/* Col 1: Playground */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-neutral-400">
              PLAYGROUND
            </div>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <motion.div whileHover={{ x: 3 }}>
                  <Link href="/app" className="hover:text-white transition-colors block">
                    Web Playground
                  </Link>
                </motion.div>
              </li>
              <li>
                <motion.div whileHover={{ x: 3 }}>
                  <Link href="/app?sample=ecommerce" className="hover:text-white transition-colors block">
                    Sample Schemas
                  </Link>
                </motion.div>
              </li>
              <li>
                <motion.div whileHover={{ x: 3 }}>
                  <Link href="/app" className="hover:text-white transition-colors block">
                    Visual ERD Canvas
                  </Link>
                </motion.div>
              </li>
              <li>
                <motion.div whileHover={{ x: 3 }}>
                  <Link href="/app" className="hover:text-white transition-colors block">
                    DBML Code Editor
                  </Link>
                </motion.div>
              </li>
            </ul>
          </motion.div>

          {/* Col 2: Compilers */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-neutral-400">
              COMPILERS
            </div>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <motion.div whileHover={{ x: 3 }}>
                  <a href="#dialects" className="hover:text-white transition-colors block">
                    PostgreSQL 14–17
                  </a>
                </motion.div>
              </li>
              <li>
                <motion.div whileHover={{ x: 3 }}>
                  <a href="#dialects" className="hover:text-white transition-colors block">
                    SQLite / LibSQL
                  </a>
                </motion.div>
              </li>
              <li>
                <motion.div whileHover={{ x: 3 }}>
                  <a href="#dialects" className="hover:text-white transition-colors block">
                    Prisma ORM v6
                  </a>
                </motion.div>
              </li>
              <li>
                <motion.div whileHover={{ x: 3 }}>
                  <a href="#dialects" className="hover:text-white transition-colors block">
                    MySQL 8.0+
                  </a>
                </motion.div>
              </li>
            </ul>
          </motion.div>

          {/* Col 3: Architecture & Security */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-neutral-400">
              ARCHITECTURE
            </div>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <motion.div whileHover={{ x: 3 }}>
                  <Link href="/docs" className="hover:text-white transition-colors block">
                    Security Specification
                  </Link>
                </motion.div>
              </li>
              <li>
                <motion.div whileHover={{ x: 3 }}>
                  <Link href="/docs#threat-model" className="hover:text-white transition-colors block">
                    Threat Model
                  </Link>
                </motion.div>
              </li>
              <li>
                <motion.div whileHover={{ x: 3 }}>
                  <a href="#benchmarks" className="hover:text-white transition-colors block">
                    Performance Benchmarks
                  </a>
                </motion.div>
              </li>
              <li>
                <motion.div whileHover={{ x: 3 }}>
                  <Link href="/docs#local-mcp" className="hover:text-white transition-colors block">
                    Local MCP Integration
                  </Link>
                </motion.div>
              </li>
            </ul>
          </motion.div>

          {/* Col 4: Community */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-neutral-400">
              COMMUNITY
            </div>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <motion.div whileHover={{ x: 3 }}>
                  <a
                    href="https://github.com/echo11labs/jayvis.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>GitHub Repository</span>
                    <ArrowUpRight className="w-3 h-3 text-neutral-500" />
                  </a>
                </motion.div>
              </li>
              <li>
                <motion.div whileHover={{ x: 3 }}>
                  <Link href="/docs" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Documentation</span>
                  </Link>
                </motion.div>
              </li>
              <li>
                <span className="text-neutral-500">MIT Open Source License</span>
              </li>
              <li>
                <span className="text-neutral-500">Zero Tracking / No Cookies</span>
              </li>
            </ul>
          </motion.div>
        </motion.div>

        {/* Bottom Hairline Metadata Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="pt-8 border-t border-neutral-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-[11px] text-neutral-500"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-white font-semibold">jayvis.dev</span>
            <span>·</span>
            <span className="text-emerald-400 font-medium">100% IN-MEMORY WASM</span>
            <span>·</span>
            <span>0 BYTES EGRESS</span>
            <span>·</span>
            <span>LOCAL-FIRST AST</span>
          </div>

          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()} JAYVIS</span>
            <span>·</span>
            <a
              href="https://github.com/echo11labs/jayvis.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              GitHub
            </a>
            <span>·</span>
            <Link href="/docs" className="text-neutral-400 hover:text-white transition-colors">
              Docs
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </footer>
  );
}
