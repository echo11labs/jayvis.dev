'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

interface ImageRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  parallax?: boolean;
  parallaxOffset?: number;
  showScanline?: boolean;
}

export function ImageReveal({
  children,
  className = '',
  delay = 0,
  duration = 0.85,
  parallax = true,
  parallaxOffset = 18,
  showScanline = true,
}: ImageRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const rawY = useTransform(scrollYProgress, [0, 1], [-parallaxOffset, parallaxOffset]);
  const y = useSpring(rawY, { stiffness: 90, damping: 26 });

  return (
    <motion.div
      ref={containerRef}
      initial={{
        opacity: 0,
        y: 28,
        filter: 'blur(8px)',
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
      }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`relative overflow-hidden group ${className}`}
    >
      {/* Parallax inner container */}
      <motion.div
        style={{ y: parallax ? y : 0 }}
        className="w-full h-full relative"
      >
        {/* Scale & Contrast transition on hover */}
        <motion.div
          initial={{ scale: 1.06 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{
            duration: duration * 1.1,
            delay,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="w-full h-full"
        >
          {children}
        </motion.div>
      </motion.div>

      {/* ── Cyberpunk Luminous Scanline Wipe on Reveal ── */}
      {showScanline && (
        <motion.div
          initial={{ top: '-10%', opacity: 0 }}
          whileInView={{ top: '110%', opacity: [0, 1, 1, 0] }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{
            duration: duration * 1.1,
            delay: delay + 0.05,
            ease: [0.25, 0.8, 0.25, 1],
          }}
          className="pointer-events-none absolute left-0 right-0 h-[2px] z-20 bg-gradient-to-r from-transparent via-[#D2FF00] to-transparent shadow-[0_0_12px_#D2FF00,0_0_24px_rgba(210,255,0,0.6)]"
        />
      )}

      {/* ── Subtle Ambient Hover Sheen ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(ellipse_at_center,rgba(210,255,0,0.04),transparent_70%)]"
        aria-hidden="true"
      />
    </motion.div>
  );
}

