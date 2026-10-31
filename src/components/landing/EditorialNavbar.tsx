'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowUpRight, Github } from 'lucide-react';
import { JayvisBrandIcon } from './Logos';

interface EditorialNavbarProps {
  onOpenRecent?: () => void;
}

export function EditorialNavbar({ onOpenRecent }: EditorialNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="w-full bg-black text-white select-none sticky top-0 z-50">
      {/* 1. Announcement Bar */}
      <div className="w-full bg-[#0a0a0a] text-white border-b border-neutral-800 px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-wider">
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
      </div>

      {/* 2. Main Navigation Bar */}
      <header className="w-full border-b border-neutral-800 bg-black/95 backdrop-blur">
        <div className="flex h-14 sm:h-16 items-stretch justify-between w-full">
          {/* Brand Mark Cell */}
          <Link
            href="/"
            className="flex items-center gap-2.5 px-6 sm:px-8 border-r border-neutral-800 hover:bg-neutral-900/50 transition-colors shrink-0 group"
          >
            <JayvisBrandIcon className="w-6 h-6 shrink-0" />
            <span className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-white">
              jayvis<span className="text-[#D2FF00]">.</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex flex-1 items-center justify-end px-6 lg:px-10 gap-6 lg:gap-8">
            <a
              href="#workflow"
              className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-neutral-400 hover:text-white transition-colors"
            >
              Workflow
            </a>
            <a
              href="#capabilities"
              className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-neutral-400 hover:text-white transition-colors"
            >
              Capabilities
            </a>
            <a
              href="#dialects"
              className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-neutral-400 hover:text-white transition-colors"
            >
              Dialects
            </a>
            <a
              href="#benchmarks"
              className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-neutral-400 hover:text-white transition-colors"
            >
              Benchmarks
            </a>
            <a
              href="#security"
              className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-neutral-400 hover:text-white transition-colors"
            >
              Security
            </a>
            <Link
              href="/app?sample=ecommerce"
              className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-neutral-400 hover:text-white transition-colors"
            >
              Samples
            </Link>
          </nav>

          {/* GitHub Repository Link */}
          <a
            href="https://github.com/echo11labs/jayvis.dev"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-6 border-l border-r border-neutral-800 hover:bg-neutral-900/50 transition-colors shrink-0 font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-neutral-300 hover:text-white"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
            <ArrowUpRight className="w-3 h-3 text-neutral-500" />
          </a>

          {/* Solid Single CTA Button */}
          <Link
            href="/app"
            className="flex items-center justify-center bg-[#D2FF00] hover:bg-[#E0FF33] text-black px-6 sm:px-8 transition-colors shrink-0 font-mono text-[11px] font-bold tracking-[0.18em] uppercase rounded-none gap-2 shadow-[0_2px_12px_rgba(210,255,0,0.2)]"
          >
            <span>Launch Studio</span>
            <span>→</span>
          </Link>

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

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-800 bg-black divide-y divide-neutral-800 font-mono">
            <Link
              href="/app"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-6 py-3 text-xs font-semibold tracking-wider uppercase text-[#D2FF00] hover:bg-neutral-900"
            >
              Launch Studio Free →
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
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-6 py-3 text-xs font-semibold tracking-wider uppercase text-neutral-300 hover:text-white hover:bg-neutral-900"
            >
              Security
            </a>
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
          </div>
        )}
      </header>
    </div>
  );
}
