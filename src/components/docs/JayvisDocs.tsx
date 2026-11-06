'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Home,
  LayoutGrid,
  Layers,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Search,
  Check,
  Copy,
  Terminal,
  ArrowRight,
  Menu,
  X,
  Database,
  ArrowLeft,
} from 'lucide-react';

export type DocSectionId =
  | 'overview'
  | 'what-is-jayvis'
  | 'how-it-works'
  | 'quick-start'
  | 'business-roi'
  | 'technical-architecture'
  | 'frontend-inventory'
  | 'security-model'
  | 'dialects';

interface NavItem {
  id: DocSectionId;
  label: string;
}

interface NavGroup {
  id: string;
  title: string;
  icon: React.ElementType;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Home,
    items: [
      { id: 'what-is-jayvis', label: 'What is Jayvis?' },
      { id: 'how-it-works', label: 'How it Works' },
      { id: 'quick-start', label: 'Quick Start' },
    ],
  },
  {
    id: 'customization',
    title: 'Customization & Dialects',
    icon: LayoutGrid,
    items: [
      { id: 'dialects', label: 'Multi-Dialect Compilers' },
      { id: 'frontend-inventory', label: 'Playground Controls & Modes' },
    ],
  },
  {
    id: 'advanced-features',
    title: 'Advanced Features',
    icon: Layers,
    items: [
      { id: 'technical-architecture', label: 'AST Compiler & Workers' },
      { id: 'business-roi', label: 'Executive ROI & Metrics' },
    ],
  },
  {
    id: 'security-community',
    title: 'Security & Community',
    icon: Users,
    items: [
      { id: 'security-model', label: 'Air-Gap & Local MCP' },
    ],
  },
];

export function JayvisDocs() {
  const [activeSection, setActiveSection] = useState<DocSectionId>('overview');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'getting-started': true,
    'customization': true,
    'advanced-features': true,
    'security-community': true,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [copiedClone, setCopiedClone] = useState(false);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleSelectSection = (id: DocSectionId) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const mcpConfig = `{
  "mcpServers": {
    "jayvis": {
      "command": "npx",
      "args": ["-y", "@jayvis/mcp-server", "--local-only"]
    }
  }
}`;

  const handleCopyMcp = () => {
    navigator.clipboard.writeText(mcpConfig);
    setCopiedMcp(true);
    setTimeout(() => setCopiedMcp(false), 2000);
  };

  const handleCopyClone = () => {
    navigator.clipboard.writeText('git clone https://github.com/echo11labs/jayvis.dev.git\ncd jayvis.dev\nnpm install\nnpm run dev');
    setCopiedClone(true);
    setTimeout(() => setCopiedClone(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900 flex flex-col justify-between">
      
      {/* ── Top Header Navigation Bar ── */}
      <header className="w-full border-b border-gray-200 bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded bg-gray-900 text-white flex items-center justify-center font-bold text-sm tracking-wider">
              J
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900">
              JAYVIS
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-gray-900 transition-colors">
              Home
            </Link>
            <Link href="/app" className="hover:text-gray-900 transition-colors">
              Playground
            </Link>
            <button
              type="button"
              onClick={() => handleSelectSection('business-roi')}
              className="hover:text-gray-900 transition-colors"
            >
              FAQ
            </button>
            <button
              type="button"
              onClick={() => handleSelectSection('overview')}
              className="hover:text-gray-900 transition-colors"
            >
              Categories
            </button>
            <div className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 cursor-pointer">
              <Search className="w-4 h-4" />
              <span>Search</span>
            </div>
            <Link
              href="/app"
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm"
            >
              Launch Playground
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* ── Sub-header Announcement Ribbon (Matches Dyno Reference) ── */}
        <div className="w-full bg-[#EEF4FE] border-t border-gray-100 py-2 text-center text-xs text-blue-700 font-medium">
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-center gap-2">
            <span className="text-blue-500">📍</span>
            <span>Jayvis Playground is 100% free, local-first &amp; open source with zero cloud egress.</span>
            <Link href="/app" className="font-semibold text-blue-700 hover:text-blue-900 underline ml-1">
              Open Playground →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Container: Sidebar + Content ── */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-14 items-start">
          
          {/* ══════════════════════════════════════════════════════════════
              LEFT SIDEBAR NAVIGATION (Accordion Style)
              ══════════════════════════════════════════════════════════════ */}
          <aside
            className={`md:col-span-4 lg:col-span-3 ${
              mobileMenuOpen ? 'block' : 'hidden md:block'
            } sticky top-24 space-y-6 text-sm`}
          >
            <nav className="space-y-5">
              {NAV_GROUPS.map((group) => {
                const GroupIcon = group.icon;
                const isOpen = openGroups[group.id] ?? true;

                return (
                  <div key={group.id} className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between text-left font-semibold text-gray-900 hover:text-black py-1 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <GroupIcon className="w-4 h-4 text-gray-500 group-hover:text-gray-900" />
                        <span className="text-sm font-medium">{group.title}</span>
                      </div>
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {isOpen && (
                      <ul className="pl-6 space-y-1.5 pt-0.5">
                        {group.items.map((item) => {
                          const isSelected = activeSection === item.id;
                          return (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={() => handleSelectSection(item.id)}
                                className={`w-full text-left text-sm py-1 transition-colors block ${
                                  isSelected
                                    ? 'text-gray-900 font-semibold'
                                    : 'text-gray-500 hover:text-gray-800'
                                }`}
                              >
                                {item.label}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* ══════════════════════════════════════════════════════════════
              RIGHT COLUMN: ACTIVE DOCUMENTATION VIEW
              ══════════════════════════════════════════════════════════════ */}
          <main className="md:col-span-8 lg:col-span-9 max-w-3xl">
            
            {/* ────────────────────────────────────────────────────────────
                VIEW 1: OVERVIEW / GETTING STARTED (Matches Reference Image)
                ──────────────────────────────────────────────────────────── */}
            {activeSection === 'overview' && (
              <div className="space-y-10">
                
                {/* Header Title & Subtitle */}
                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight leading-tight">
                    Getting Started with Jayvis
                  </h1>
                  <p className="text-base sm:text-lg text-gray-600 leading-relaxed font-normal">
                    Congratulations on choosing Jayvis to create your new documentation website and relational database architectures. Whether you&apos;re a seasoned developer or a beginner, this guide will walk you through the essential steps to get started. Let&apos;s dive in!
                  </p>
                </div>

                {/* "Start here" Section */}
                <div className="space-y-4 pt-2">
                  <h2 className="text-xl font-bold text-gray-900">
                    Start here
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    Jayvis is an architectural design playground for software databases. It gives engineering teams a visual, interactive blueprint combined with live declarative code (DBML) to design, explore, validate, and deploy database architectures with zero risk, zero cloud infrastructure costs, and 100% data privacy.
                  </p>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    Think of it as &quot;Figma + Compiler for Relational Databases&quot;. Unlike traditional cloud diagramming tools that upload your proprietary schema to external servers, Jayvis executes entirely inside your browser memory using WebAssembly. No database credentials are ever required, zero telemetry is transmitted, and your schema metadata never leaves your device.
                  </p>
                </div>

                {/* Quick Navigation Rows with ↗ Arrow (Exact Divider Layout from Dyno Reference) */}
                <div className="border-t border-b border-gray-200 divide-y divide-gray-200 pt-1">
                  <div
                    onClick={() => handleSelectSection('what-is-jayvis')}
                    className="py-4 px-1 flex items-center justify-between text-gray-900 hover:text-blue-600 font-medium text-sm sm:text-base cursor-pointer group transition-colors"
                  >
                    <span>What is Jayvis?</span>
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>

                  <div
                    onClick={() => handleSelectSection('how-it-works')}
                    className="py-4 px-1 flex items-center justify-between text-gray-900 hover:text-blue-600 font-medium text-sm sm:text-base cursor-pointer group transition-colors"
                  >
                    <span>How it Works</span>
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>

                  <div
                    onClick={() => handleSelectSection('quick-start')}
                    className="py-4 px-1 flex items-center justify-between text-gray-900 hover:text-blue-600 font-medium text-sm sm:text-base cursor-pointer group transition-colors"
                  >
                    <span>Quick Start</span>
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>

                {/* Categories Section (2x2 Grid with Subtle Dividers from Dyno Reference) */}
                <div className="space-y-6 pt-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    Categories
                  </h3>

                  <div className="border-t border-b border-gray-200 divide-y divide-gray-200">
                    
                    {/* Row 1: Getting Started | Advanced Features */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
                      
                      {/* Cell 1: Getting Started */}
                      <div
                        onClick={() => handleSelectSection('what-is-jayvis')}
                        className="py-6 sm:py-7 px-4 sm:px-6 cursor-pointer hover:bg-gray-50/50 transition-colors group"
                      >
                        <Home className="w-5 h-5 text-gray-900 mb-3" />
                        <h4 className="text-sm font-bold text-gray-900 mb-1.5 group-hover:text-blue-600 transition-colors">
                          Getting Started
                        </h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Understand the fundamental paradigm of Jayvis, bilateral sync, and visual database architecture.
                        </p>
                      </div>

                      {/* Cell 2: Advanced Features */}
                      <div
                        onClick={() => handleSelectSection('technical-architecture')}
                        className="py-6 sm:py-7 px-4 sm:px-6 cursor-pointer hover:bg-gray-50/50 transition-colors group"
                      >
                        <Layers className="w-5 h-5 text-gray-900 mb-3" />
                        <h4 className="text-sm font-bold text-gray-900 mb-1.5 group-hover:text-blue-600 transition-colors">
                          Advanced Features
                        </h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Deep-dive into the Lezer incremental parser, off-thread ELK layout worker, and PGlite/SQLite WASM sandboxes.
                        </p>
                      </div>

                    </div>

                    {/* Row 2: Customization | Community */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
                      
                      {/* Cell 3: Customization */}
                      <div
                        onClick={() => handleSelectSection('dialects')}
                        className="py-6 sm:py-7 px-4 sm:px-6 cursor-pointer hover:bg-gray-50/50 transition-colors group"
                      >
                        <LayoutGrid className="w-5 h-5 text-gray-900 mb-3" />
                        <h4 className="text-sm font-bold text-gray-900 mb-1.5 group-hover:text-blue-600 transition-colors">
                          Customization
                        </h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Compile declarative DBML schemas into verified production DDL for PostgreSQL, SQLite, Prisma ORM, Supabase, and MySQL.
                        </p>
                      </div>

                      {/* Cell 4: Community */}
                      <div
                        onClick={() => handleSelectSection('security-model')}
                        className="py-6 sm:py-7 px-4 sm:px-6 cursor-pointer hover:bg-gray-50/50 transition-colors group"
                      >
                        <Users className="w-5 h-5 text-gray-900 mb-3" />
                        <h4 className="text-sm font-bold text-gray-900 mb-1.5 group-hover:text-blue-600 transition-colors">
                          Community
                        </h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Audit our air-gapped zero-egress architecture, Fig 2.1 trust boundary, and local Model Context Protocol (MCP).
                        </p>
                      </div>

                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* ────────────────────────────────────────────────────────────
                VIEW 2: WHAT IS JAYVIS? (Clean White Typography)
                ──────────────────────────────────────────────────────────── */}
            {activeSection === 'what-is-jayvis' && (
              <div className="space-y-8">
                <div>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('overview')}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-medium mb-3"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Getting Started</span>
                  </button>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                    What is JayVis in Simple Business Terms?
                  </h1>
                  <p className="text-base text-gray-600 leading-relaxed mt-3">
                    JayVis is an architectural design playground for software databases. It gives engineering teams a visual, interactive blueprint combined with code to design, explore, validate, and deploy database architectures with zero risk, zero cloud infrastructure costs, and 100% data privacy.
                  </p>
                </div>

                {/* Concept Analogy */}
                <div className="border-l-4 border-gray-900 pl-4 py-1">
                  <h3 className="text-base font-bold text-gray-900">
                    Think of it as &quot;Figma + Compiler for Relational Databases&quot;
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed mt-1">
                    You can design the database by typing concise code or by arranging tables visually on an interactive board, while JayVis guarantees both stay in continuous, perfect synchronization. Non-technical stakeholders see system flows; developers inspect exact types and indexes.
                  </p>
                </div>

                {/* The Problems JayVis Solves */}
                <div className="space-y-5 pt-4 border-t border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">The Business Problems JayVis Solves</h2>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        01 // Preventing Database Migration Disasters
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        A broken migration or bad foreign key can cause hours of catastrophic downtime, corrupted customer data, and lost revenue. JayVis computes automated schema diffs and generates mathematically safe, verified ALTER TABLE scripts before anything reaches production.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        02 // Bridging the Cross-Functional Disconnect
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Engineers write cryptic SQL scripts; Product Managers and Executives think in diagrams. JayVis provides a shared visual ERD board linked directly to the code so technical and non-technical teammates build with unified clarity.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        03 // Protecting Intellectual Property &amp; Air-Gap Security
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Traditional cloud diagramming tools require uploading your company schema and database connection strings to third-party servers. JayVis runs 100% in browser memory with zero egress. No credentials required, zero telemetry collected.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Pagination */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleSelectSection('overview')}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    ← Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('how-it-works')}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>Next: How it Works</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ────────────────────────────────────────────────────────────
                VIEW 3: HOW IT WORKS
                ──────────────────────────────────────────────────────────── */}
            {activeSection === 'how-it-works' && (
              <div className="space-y-8">
                <div>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('overview')}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-medium mb-3"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Getting Started</span>
                  </button>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                    How Jayvis Works: Two-Way Reactive Synchrony
                  </h1>
                  <p className="text-base text-gray-600 leading-relaxed mt-3">
                    Jayvis maintains an in-memory Abstract Syntax Tree (AST) that serves as the single source of truth across code, canvas, and database execution sandboxes.
                  </p>
                </div>

                <div className="space-y-6 pt-4 border-t border-gray-200">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Stage 01 // Declarative DBML Code
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Type tables, fields, and foreign keys in the CodeMirror editor. Lezer parses incrementally in &lt; 10ms with zero debounce delay, instantly updating the underlying AST.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Stage 02 // Off-Thread Graph Layout Engine
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      An isolated Web Worker routes orthogonal foreign-key edges and positions nodes without dropping below 60 FPS on the UI thread, even for 50–100+ table architectures.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Stage 03 // WASM In-Memory Execution
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Embedded PGlite and SQLite WASM engines execute queries, validate constraints, and seed topologically ordered mock data directly inside browser RAM.
                    </p>
                  </div>
                </div>

                {/* Bottom Pagination */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleSelectSection('what-is-jayvis')}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    ← What is Jayvis?
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('quick-start')}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>Next: Quick Start</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ────────────────────────────────────────────────────────────
                VIEW 4: QUICK START
                ──────────────────────────────────────────────────────────── */}
            {activeSection === 'quick-start' && (
              <div className="space-y-8">
                <div>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('overview')}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-medium mb-3"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Getting Started</span>
                  </button>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                    Quick Start &amp; Local Setup
                  </h1>
                  <p className="text-base text-gray-600 leading-relaxed mt-3">
                    Jayvis is built local-first. You can run it entirely on your computer with zero external database configuration, zero cloud keys, and 100% air-gap isolation.
                  </p>
                </div>

                {/* Terminal Commands */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 font-medium flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      Terminal Commands
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyClone}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      {copiedClone ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedClone ? 'Copied' : 'Copy Commands'}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded-md p-4 overflow-x-auto leading-relaxed">
                    <span className="text-gray-400"># 1. Clone repository</span>{'\n'}
                    git clone https://github.com/echo11labs/jayvis.dev.git{'\n'}
                    cd jayvis.dev{'\n\n'}
                    <span className="text-gray-400"># 2. Install dependencies &amp; compile WASM engines</span>{'\n'}
                    npm install{'\n\n'}
                    <span className="text-gray-400"># 3. Start local development server</span>{'\n'}
                    npm run dev
                  </pre>
                </div>

                <div className="pt-2">
                  <Link
                    href="/app?sample=ecommerce"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <span>Launch Playground with Preloaded Sample Schema</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Bottom Pagination */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleSelectSection('how-it-works')}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    ← How it Works
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('dialects')}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>Next: Multi-Dialect Compilers</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ────────────────────────────────────────────────────────────
                VIEW 5: DIALECTS
                ──────────────────────────────────────────────────────────── */}
            {activeSection === 'dialects' && (
              <div className="space-y-8">
                <div>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('overview')}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-medium mb-3"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Getting Started</span>
                  </button>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                    Multi-Dialect DDL Compilers
                  </h1>
                  <p className="text-base text-gray-600 leading-relaxed mt-3">
                    Jayvis compiles declarative DBML into verified production schemas for every major relational database engine with zero vendor lock-in.
                  </p>
                </div>

                <div className="space-y-6 pt-4 border-t border-gray-200">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-gray-900">PostgreSQL (14–17)</div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Emits native UUID keys (`gen_random_uuid()`), TIMESTAMPTZ columns, cascading referential actions (`ON DELETE CASCADE`), and composite/partial indexes.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-bold text-gray-900">SQLite 3.40+ / LibSQL (Turso)</div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Emits transactional DDL with strict `PRAGMA foreign_keys = ON` enforcement, autoincrement integer keys, and standard SQLite storage mappings.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-bold text-gray-900">Prisma ORM (v5 / v6)</div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Emits PascalCase TypeScript models, `@relation(fields: [...], references: [...], onDelete: Cascade)` attributes, and snake_case `@@map` annotations.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-bold text-gray-900">Supabase &amp; MySQL 8.0+</div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Emits auth.users foreign keys and Row Level Security (RLS) scaffolding for Supabase, and InnoDB utf8mb4 storage table definitions for MySQL.
                    </p>
                  </div>
                </div>

                {/* Bottom Pagination */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleSelectSection('quick-start')}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    ← Quick Start
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('frontend-inventory')}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>Next: Playground Controls</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ────────────────────────────────────────────────────────────
                VIEW 6: FRONTEND INVENTORY
                ──────────────────────────────────────────────────────────── */}
            {activeSection === 'frontend-inventory' && (
              <div className="space-y-8">
                <div>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('overview')}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-medium mb-3"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Getting Started</span>
                  </button>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                    Playground IDE &amp; Command Strip Hierarchy
                  </h1>
                  <p className="text-base text-gray-600 leading-relaxed mt-3">
                    Authoritative interface specification for the playground command strip, three-way stage view modes, Schema Explorer, and Inspector panels.
                  </p>
                </div>

                <div className="space-y-6 pt-4 border-t border-gray-200">
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-gray-900">Stage View Modes &amp; Shortcuts</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      The top command strip lets users toggle instantly between three distinct working modes:
                    </p>
                    <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                      <li><strong>Code Only (⌘1):</strong> Maximized editor with multi-file tabs.</li>
                      <li><strong>Board Only (⌘2):</strong> Fullscreen React Flow canvas with interactive relationship handles.</li>
                      <li><strong>Split Stage (⌘3):</strong> Two-way synchronized side-by-side editing.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-gray-900">Left Panel: Schema Explorer (⌘B)</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Collapsible sidebar providing workspace control, engine switching between SQLite and PostgreSQL, table search, and one-click sample presets.
                    </p>
                  </div>
                </div>

                {/* Bottom Pagination */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleSelectSection('dialects')}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    ← Multi-Dialect Compilers
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('technical-architecture')}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>Next: Core Architecture</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ────────────────────────────────────────────────────────────
                VIEW 7: TECHNICAL ARCHITECTURE
                ──────────────────────────────────────────────────────────── */}
            {activeSection === 'technical-architecture' && (
              <div className="space-y-8">
                <div>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('overview')}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-medium mb-3"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Getting Started</span>
                  </button>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                    Technical Architecture Specification
                  </h1>
                  <p className="text-base text-gray-600 leading-relaxed mt-3">
                    Jayvis is an in-browser Abstract Syntax Tree (AST) database compiler and reactive visual ERD IDE built on Next.js 16, React 19, CodeMirror 6, React Flow 12, and WebAssembly.
                  </p>
                </div>

                <div className="space-y-6 pt-4 border-t border-gray-200">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-gray-900">01 // Lezer LALR Incremental Parser</div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Instead of running regex or full-document re-parses, CodeMirror 6 uses Lezer to parse DBML 2.6 syntax incrementally in &lt; 10ms. Changes in the editor synchronize into the Zustand AST without causing layout jitter or cursor reset.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-bold text-gray-900">02 // Off-Thread ELK Graph Layout Worker</div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Laying out schemas with 40–100+ tables and hundreds of foreign-key edges is computationally heavy. Jayvis delegates coordinate and port calculation to a dedicated Web Worker running `elkjs` (`org.eclipse.elk.layered`), keeping the main thread strictly at 60 FPS (&lt; 16.6ms frame budget).
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-bold text-gray-900">03 // In-Browser PGlite &amp; SQLite WASM Sandbox</div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Jayvis embeds real PostgreSQL (PGlite) and SQLite WebAssembly directly into browser memory. Users can execute DDL migrations, inspect system catalogs, and run SQL queries locally with zero server roundtrips.
                    </p>
                  </div>
                </div>

                {/* Bottom Pagination */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleSelectSection('frontend-inventory')}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    ← Playground Controls
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('business-roi')}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>Next: Business ROI</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ────────────────────────────────────────────────────────────
                VIEW 8: BUSINESS ROI
                ──────────────────────────────────────────────────────────── */}
            {activeSection === 'business-roi' && (
              <div className="space-y-8">
                <div>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('overview')}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-medium mb-3"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Getting Started</span>
                  </button>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                    Business ROI, Cost Savings &amp; Security Compliance
                  </h1>
                  <p className="text-base text-gray-600 leading-relaxed mt-3">
                    How Jayvis eliminates engineering hours, prevents multi-thousand-dollar cloud bills, and achieves instant compliance approval.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-gray-900">10x</div>
                    <div className="text-sm font-bold text-gray-900">Faster Architectural Velocity</div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Designing a 25-table domain takes under 2 hours in Jayvis versus 2 days of manual SQL handwriting and diagram drafting.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-gray-900">$0</div>
                    <div className="text-sm font-bold text-gray-900">Zero Cloud Infrastructure Overhead</div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Because execution runs in browser memory, teams eliminate unnecessary dev-database cloud instances, saving $3,000–$15,000 annually.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-gray-900">75%</div>
                    <div className="text-sm font-bold text-gray-900">Reduction in Migration Incidents</div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Automated syntax linting, circular relationship detection, and composite index diagnostics catch defects before code review.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-gray-900">SOC 2</div>
                    <div className="text-sm font-bold text-gray-900">Instant Enterprise Security Clearance</div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Because customer data and schemas never touch an external server, enterprise security teams approve Jayvis immediately.
                    </p>
                  </div>
                </div>

                {/* Bottom Pagination */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleSelectSection('technical-architecture')}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    ← Core Architecture
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('security-model')}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>Next: Security &amp; Threat Model</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ────────────────────────────────────────────────────────────
                VIEW 9: SECURITY & THREAT MODEL
                ──────────────────────────────────────────────────────────── */}
            {activeSection === 'security-model' && (
              <div className="space-y-8">
                <div>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('overview')}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-medium mb-3"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Getting Started</span>
                  </button>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                    Air-Gapped Client Security &amp; Threat Model
                  </h1>
                  <p className="text-base text-gray-600 leading-relaxed mt-3">
                    Detailed analysis of the client-side execution perimeter, zero-ingestion guarantees, and local Model Context Protocol (MCP) bridge.
                  </p>
                </div>

                {/* Fig 2.1 Flowchart Graphic */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="text-xs font-medium text-gray-500 flex items-center justify-between">
                    <span>Fig 2.1 // Air-Gapped Security Architecture &amp; Zero-Egress Boundary</span>
                    <span className="font-semibold text-gray-900">100% Air-Gapped</span>
                  </div>
                  <div className="relative aspect-[16/9] w-full border border-gray-200 rounded-md overflow-hidden bg-gray-950">
                    <Image
                      src="/diagrams/security-architecture-flowchart.jpg"
                      alt="Jayvis Air-Gapped Security Architecture and Zero-Egress Boundary Flowchart"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>

                {/* Local MCP Integration */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-900 font-semibold">Local Model Context Protocol (MCP) Integration</span>
                    <button
                      type="button"
                      onClick={handleCopyMcp}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      {copiedMcp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedMcp ? 'Copied' : 'Copy Config'}</span>
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Jayvis connects to AI tools (such as Claude Desktop, Cursor, or Gemini) using the official Model Context Protocol via a local Unix pipe. No schema data leaves your machine.
                  </p>
                  <pre className="font-mono text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded-md p-4 overflow-x-auto leading-relaxed">
                    {mcpConfig}
                  </pre>
                </div>

                {/* Bottom Pagination */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleSelectSection('business-roi')}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    ← Business ROI
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('overview')}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>Return to Getting Started</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

          </main>

        </div>
      </div>

      {/* ── Footer Matching Reference Screenshot ── */}
      <footer className="w-full border-t border-gray-200 bg-white py-12 text-sm text-gray-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-center">
          
          {/* Row 1: Primary Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
            <Link href="/app" className="hover:text-gray-900 transition-colors">Playground</Link>
            <button type="button" onClick={() => handleSelectSection('business-roi')} className="hover:text-gray-900 transition-colors">FAQ</button>
            <button type="button" onClick={() => handleSelectSection('overview')} className="hover:text-gray-900 transition-colors">Categories</button>
            <a href="https://github.com/echo11labs/jayvis.dev" target="_blank" rel="noreferrer" className="hover:text-gray-900 transition-colors">GitHub</a>
            <Link href="/app" className="hover:text-gray-900 transition-colors">Sign in</Link>
          </div>

          {/* Row 2: Secondary / Resource Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400">
            <button type="button" onClick={() => handleSelectSection('what-is-jayvis')} className="hover:text-gray-600 transition-colors">What is Jayvis?</button>
            <button type="button" onClick={() => handleSelectSection('technical-architecture')} className="hover:text-gray-600 transition-colors">Architecture</button>
            <button type="button" onClick={() => handleSelectSection('security-model')} className="hover:text-gray-600 transition-colors">Security Model</button>
            <button type="button" onClick={() => handleSelectSection('dialects')} className="hover:text-gray-600 transition-colors">Dialects</button>
            <span className="text-gray-300">•</span>
            <span>MIT Licensed</span>
          </div>

          {/* Row 3: Copyright */}
          <div className="text-xs text-gray-400 pt-2">
            © Jayvis — 2026. All rights reserved. Powered by local-first WASM.
          </div>

        </div>
      </footer>

    </div>
  );
}
