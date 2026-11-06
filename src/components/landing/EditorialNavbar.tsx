'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowUpRight, Github } from 'lucide-react';

interface EditorialNavbarProps {
  onOpenRecent?: () => void;
}

export function EditorialNavbar({ onOpenRecent }: EditorialNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="w-full bg-black text-white select-none sticky top-0 z-50">
      {/* 1. Announcement Bar */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full bg-[#0a0a0a] text-white border-b border-neutral-800 px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-wider"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 bg-[#D2FF00] inline-block animate-pulse shadow-[0_0_8px_rgba(210,255,0,0.6)]" />
          <span className="font-bold text-white">LOCAL-FIRST DATABASE STUDIO</span>
          <span className="text-neutral-600 hidden sm:inline">|</span>
          <span className="text-neutral-400 hidden sm:inline">100% IN BROWSER MEMORY · ZERO SERVER CREDENTIALS</span>
        </div>
        <div className="flex items-center gap-4 text-neutral-400 text-[10px] sm:text-[11px]">
          <span className="hidden md:inline">POSTGRESQL · SQLITE · PRISMA · SUPABASE · MYSQL</span>
          <span className="text-neutral-600 hidden md:inline">|</span>
          <span className="text-[#D2FF00] font-semibold">AIR-GAPPED READY</span>
        </div>
      </motion.div>

      {/* 2. Main Navigation Bar */}
      <header className="w-full border-b border-neutral-800 bg-black/95 backdrop-blur">
        <div className="flex h-14 sm:h-16 items-stretch justify-between w-full">
          {/* Brand Mark Cell */}
          <Link
            href="/"
            className="flex items-center gap-2.5 px-6 sm:px-8 border-r border-neutral-800 hover:bg-neutral-900/50 transition-colors shrink-0 group"
          >
            <motion.div whileHover={{ scale: 1.08 }} transition={{ duration: 0.2 }}>
              <Image
                src="/logo.png"
                alt="Jayvis Logo"
                width={26}
                height={26}
                className="w-6 h-6 shrink-0 object-contain"
                priority
              />
            </motion.div>
            <span className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-white">
              jayvis<span className="text-[#D2FF00]">.</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex flex-1 items-center justify-end px-6 lg:px-10 gap-6 lg:gap-8">
            <motion.a
              href="#workflow"
              whileHover={{ y: -1, color: '#ffffff' }}
              className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-neutral-400 hover:text-white transition-colors"
            >
              Workflow
            </motion.a>
            <motion.a
              href="#capabilities"
              whileHover={{ y: -1, color: '#ffffff' }}
              className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-neutral-400 hover:text-white transition-colors"
            >
              Capabilities
            </motion.a>
            <motion.a
              href="#dialects"
              whileHover={{ y: -1, color: '#ffffff' }}
              className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-neutral-400 hover:text-white transition-colors"
            >
              Dialects
            </motion.a>
            <motion.a
              href="#benchmarks"
              whileHover={{ y: -1, color: '#ffffff' }}
              className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-neutral-400 hover:text-white transition-colors"
            >
              Benchmarks
            </motion.a>
            <motion.div whileHover={{ y: -1 }}>
              <Link
                href="/docs"
                className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-neutral-400 hover:text-white transition-colors"
              >
                Docs
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -1 }}>
              <Link
                href="/app?sample=ecommerce"
                className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-neutral-400 hover:text-white transition-colors"
              >
                Samples
              </Link>
            </motion.div>
          </nav>

          {/* GitHub Repository Link */}
          <motion.a
            href="https://github.com/echo11labs/jayvis.dev"
            target="_blank"
            rel="noreferrer"
            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            className="hidden sm:flex items-center gap-1.5 px-6 border-l border-r border-neutral-800 transition-colors shrink-0 font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-neutral-300 hover:text-white"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
            <ArrowUpRight className="w-3 h-3 text-neutral-500" />
          </motion.a>

          {/* Solid Single CTA Button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex">
            <Link
              href="/app"
              className="flex items-center justify-center bg-[#D2FF00] hover:bg-[#E0FF33] text-black px-6 sm:px-8 transition-colors shrink-0 font-mono text-[11px] font-bold tracking-[0.18em] uppercase rounded-none gap-2 shadow-[0_2px_12px_rgba(210,255,0,0.2)]"
            >
              <span>Launch Playground</span>
              <span>→</span>
            </Link>
          </motion.div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center px-4 border-l border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-900 shrink-0"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu with AnimatePresence */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="md:hidden border-t border-neutral-800 bg-black divide-y divide-neutral-800 font-mono overflow-hidden"
            >
              <Link
                href="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-6 py-3 text-xs font-semibold tracking-wider uppercase text-[#D2FF00] hover:bg-neutral-900"
              >
                Launch Playground Free →
              </Link>
              <a
                href="#workflow"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-6 py-3 text-xs font-semibold tracking-wider uppercase text-neutral-300 hover:text-white hover:bg-neutral-900"
              >
                Workflow
              </a>
              <a
                href="#capabilities"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-6 py-3 text-xs font-semibold tracking-wider uppercase text-neutral-300 hover:text-white hover:bg-neutral-900"
              >
                Capabilities
              </a>
              <a
                href="#dialects"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-6 py-3 text-xs font-semibold tracking-wider uppercase text-neutral-300 hover:text-white hover:bg-neutral-900"
              >
                Dialects
              </a>
              <a
                href="#benchmarks"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-6 py-3 text-xs font-semibold tracking-wider uppercase text-neutral-300 hover:text-white hover:bg-neutral-900"
              >
                Benchmarks
              </a>
              <Link
                href="/docs"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-6 py-3 text-xs font-semibold tracking-wider uppercase text-neutral-300 hover:text-white hover:bg-neutral-900"
              >
                Documentation
              </Link>
              <Link
                href="/app?sample=ecommerce"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-6 py-3 text-xs font-semibold tracking-wider uppercase text-neutral-300 hover:text-white hover:bg-neutral-900"
              >
                Sample Schemas
              </Link>
              <a
                href="https://github.com/echo11labs/jayvis.dev"
                target="_blank"
                rel="noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-6 py-3 text-xs font-semibold tracking-wider uppercase text-neutral-300 hover:text-white hover:bg-neutral-900"
              >
                <span className="flex items-center gap-2">
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub Repository</span>
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500" />
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </div>
  );
}
