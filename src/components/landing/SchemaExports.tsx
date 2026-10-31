'use client';

import React, { useState } from 'react';
import { Copy, Check, FileCode2, Code2, Download } from 'lucide-react';

type FormatKey = 'sql' | 'prisma' | 'svg' | 'dbml' | 'json';

interface FormatItem {
  id: FormatKey;
  label: string;
  heading: string;
  description: string;
  filename: string;
  badge: string;
}

const FORMATS: FormatItem[] = [
  {
    id: 'sql',
    label: 'SQL DDL',
    heading: 'From schema to SQL.',
    description: 'Export table definitions and relationships as SQL DDL.',
    filename: 'schema.sql',
    badge: 'SQL DDL',
  },
  {
    id: 'prisma',
    label: 'Prisma',
    heading: 'Bring the structure into your app.',
    description: 'Export your schema as Prisma model definitions.',
    filename: 'schema.prisma',
    badge: 'PRISMA ORM',
  },
  {
    id: 'svg',
    label: 'ERD SVG',
    heading: 'Share the bigger picture.',
    description: 'Export a vector diagram for documentation and discussion.',
    filename: 'diagram.svg',
    badge: 'VECTOR SVG',
  },
  {
    id: 'dbml',
    label: 'DBML',
    heading: 'Keep the source readable.',
    description: 'Export your schema in the same text-based format you design with.',
    filename: 'schema.dbml',
    badge: 'DBML SPEC',
  },
  {
    id: 'json',
    label: 'JSON AST',
    heading: 'Work with structured schema data.',
    description: 'Export a structured representation for custom tooling.',
    filename: 'schema.ast.json',
    badge: 'AST JSON',
  },
];

export function SchemaExports() {
  const [activeFormat, setActiveFormat] = useState<FormatKey>('sql');
  const [copied, setCopied] = useState(false);

  const current = FORMATS.find((f) => f.id === activeFormat) ?? FORMATS[0];

  const handleCopy = () => {
    let textToCopy = '';
    if (activeFormat === 'sql') {
      textToCopy = `CREATE TABLE "users" (\n  "id" integer PRIMARY KEY,\n  "email" varchar NOT NULL UNIQUE\n);`;
    } else if (activeFormat === 'prisma') {
      textToCopy = `model User {\n  id    Int     @id @default(autoincrement())\n  email String  @unique\n}`;
    } else if (activeFormat === 'dbml') {
      textToCopy = `Table users {\n  id integer [pk, increment]\n  email varchar [not null, unique]\n}`;
    } else if (activeFormat === 'json') {
      textToCopy = JSON.stringify(
        {
          tables: [
            {
              name: 'users',
              fields: [
                { name: 'id', type: 'integer', pk: true },
                { name: 'email', type: 'varchar', notNull: true, unique: true },
              ],
            },
          ],
        },
        null,
        2,
      );
    } else {
      textToCopy = '<svg>...</svg>';
    }

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="exports"
      aria-label="Export schema in multiple formats"
      className="relative w-full bg-black text-white border-t border-neutral-800/80 pt-20 sm:pt-28 pb-20 sm:pb-28 select-none"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Centered Section Header */}
        <div className="text-center max-w-2xl mx-auto">
          {/* Eyebrow - Pure typography, no badge container */}
          <p className="font-mono text-xs sm:text-[13px] font-semibold tracking-[0.2em] uppercase text-[#D2FF00] mb-3">
            BUILT TO LEAVE THE CANVAS
          </p>

          {/* Section Headline */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight text-balance">
            Your schema.
            <br />
            In the format you need.
          </h2>

          {/* Supporting Statement */}
          <p className="mt-4 text-base sm:text-lg text-neutral-400 font-normal leading-relaxed text-balance">
            Export SQL DDL for your database, Prisma definitions for your application, or an SVG diagram for your documentation. Keep DBML and JSON AST available for the workflows you build around them.
          </p>
        </div>

        {/* Tabbed Output Panel - Zero Border Radius */}
        <div className="mt-12 sm:mt-16 rounded-none border border-neutral-800 bg-[#0a0a0a] shadow-[0_24px_70px_rgba(0,0,0,0.9)] overflow-hidden">
          {/* Top Format Selector Bar */}
          <div
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6 bg-[#0f0f0f] border-b border-neutral-800 overflow-x-auto scrollbar-none"
            role="tablist"
            aria-label="Export formats"
          >
            {FORMATS.map((format) => {
              const isActive = format.id === activeFormat;
              return (
                <button
                  key={format.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${format.id}`}
                  onClick={() => setActiveFormat(format.id)}
                  className={`font-mono text-xs sm:text-[13px] font-bold px-3.5 sm:px-5 py-3 sm:py-3.5 transition-all whitespace-nowrap border-b-2 ${
                    isActive
                      ? 'text-white border-[#D2FF00] bg-neutral-900/60 shadow-[0_4px_12px_rgba(210,255,0,0.15)]'
                      : 'text-neutral-500 hover:text-neutral-300 border-transparent hover:bg-neutral-900/30'
                  }`}
                >
                  {format.label}
                </button>
              );
            })}
          </div>

          {/* Split Content: Explanation (1/3) + Preview (2/3) */}
          <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-neutral-800">
            {/* Left Explanation Column (~1/3 width) */}
            <div className="lg:w-1/3 p-6 sm:p-8 flex flex-col justify-between bg-[#0c0c0c]">
              <div>
                {/* Format Tag */}
                <div className="font-mono text-[10px] font-bold tracking-widest text-[#D2FF00] mb-3 uppercase">
                  {current.badge}
                </div>

                {/* Contextual Heading */}
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2.5">
                  {current.heading}
                </h3>

                {/* Contextual Description */}
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {current.description}
                </p>
              </div>

              {/* Status Note */}
              <div className="pt-6 mt-6 border-t border-neutral-800/80 font-mono text-[11px] text-neutral-500 flex items-center justify-between">
                <span>Output Artifact</span>
                <span className="text-[#D2FF00]">Ready to export</span>
              </div>
            </div>

            {/* Right Output Preview Column (~2/3 width) */}
            <div
              id={`panel-${current.id}`}
              role="tabpanel"
              className="lg:w-2/3 p-5 sm:p-6 flex flex-col justify-between bg-[#050505] font-mono text-xs"
            >
              {/* Preview Window Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800/80 text-[11px] text-neutral-400">
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-3.5 h-3.5 text-[#D2FF00]" aria-hidden="true" />
                  <span className="text-white font-bold">{current.filename}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-[10px] uppercase font-bold tracking-wider transition-colors"
                  aria-label="Copy output code"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-[#D2FF00]" />
                      <span className="text-[#D2FF00]">COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-neutral-400" />
                      <span>COPY</span>
                    </>
                  )}
                </button>
              </div>

              {/* Preview Content Area (Consistent fixed height across all tabs) */}
              <div className="h-[210px] sm:h-[220px] flex items-center overflow-x-auto text-neutral-200">
                {/* 1. SQL DDL */}
                {activeFormat === 'sql' && (
                  <div className="w-full text-xs sm:text-[13px] leading-relaxed text-neutral-300 space-y-1">
                    <div>
                      <span className="text-[#D2FF00] font-semibold">CREATE TABLE</span> <span className="text-white font-bold">&quot;users&quot;</span> (
                    </div>
                    <div className="pl-5 text-white">
                      &quot;id&quot; <span className="text-neutral-400">integer</span> <span className="text-[#D2FF00] font-bold">PRIMARY KEY</span>,
                    </div>
                    <div className="pl-5 text-neutral-300">
                      &quot;email&quot; <span className="text-neutral-400">varchar</span> <span className="text-neutral-400">NOT NULL</span> <span className="text-[#D2FF00] font-bold">UNIQUE</span>
                    </div>
                    <div className="text-neutral-400">);</div>
                  </div>
                )}

                {/* 2. Prisma */}
                {activeFormat === 'prisma' && (
                  <div className="w-full text-xs sm:text-[13px] leading-relaxed text-neutral-300 space-y-1">
                    <div>
                      <span className="text-[#D2FF00] font-semibold">model</span> <span className="text-white font-bold">User</span> {'{'}
                    </div>
                    <div className="pl-5 flex items-center justify-between max-w-md">
                      <span className="text-white">id</span>
                      <span className="text-neutral-400">Int</span>
                      <span className="text-[#D2FF00] font-semibold">@id @default(autoincrement())</span>
                    </div>
                    <div className="pl-5 flex items-center justify-between max-w-md">
                      <span className="text-white">email</span>
                      <span className="text-neutral-400">String</span>
                      <span className="text-[#D2FF00] font-semibold">@unique</span>
                    </div>
                    <div className="text-neutral-400">{'}'}</div>
                  </div>
                )}

                {/* 3. ERD SVG Vector Demonstration */}
                {activeFormat === 'svg' && (
                  <div className="w-full h-full flex items-center justify-center p-2 bg-[#080808]">
                    <svg viewBox="0 0 520 180" className="w-full max-h-[190px]" aria-label="ERD Vector Preview">
                      {/* Grid background */}
                      <defs>
                        <pattern id="export-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <circle cx="2" cy="2" r="0.75" fill="#262626" />
                        </pattern>
                      </defs>
                      <rect width="520" height="180" fill="#080808" />
                      <rect width="520" height="180" fill="url(#export-grid)" />

                      {/* Table: users */}
                      <g transform="translate(30, 25)">
                        <rect width="180" height="120" fill="#000" stroke="#333" strokeWidth="1" />
                        <rect width="180" height="26" fill="#141414" />
                        <text x="12" y="18" fill="#FFF" fontSize="12" fontFamily="monospace" fontWeight="bold">users</text>
                        <rect x="156" y="8" width="10" height="10" fill="#D2FF00" />

                        {/* Columns */}
                        <text x="12" y="52" fill="#D2FF00" fontSize="11" fontFamily="monospace">id</text>
                        <text x="140" y="52" fill="#888" fontSize="10" fontFamily="monospace">INT [PK]</text>
                        <line x1="12" y1="62" x2="168" y2="62" stroke="#222" strokeWidth="1" />

                        <text x="12" y="82" fill="#EEE" fontSize="11" fontFamily="monospace">email</text>
                        <text x="135" y="82" fill="#888" fontSize="10" fontFamily="monospace">VARCHAR</text>
                        <line x1="12" y1="92" x2="168" y2="92" stroke="#222" strokeWidth="1" />

                        <text x="12" y="112" fill="#888" fontSize="10" fontFamily="monospace">created_at</text>
                        <text x="110" y="112" fill="#555" fontSize="10" fontFamily="monospace">TIMESTAMP</text>
                      </g>

                      {/* Connector Line with Cardinality Badge */}
                      <path d="M 210 52 L 270 52 L 270 52 L 310 52" fill="none" stroke="#D2FF00" strokeWidth="2" strokeDasharray="none" />
                      <rect x="245" y="40" width="30" height="18" fill="#000" stroke="#D2FF00" strokeWidth="1" />
                      <text x="252" y="53" fill="#D2FF00" fontSize="10" fontFamily="monospace" fontWeight="bold">1:*</text>

                      {/* Table: orders */}
                      <g transform="translate(310, 25)">
                        <rect width="180" height="120" fill="#000" stroke="#333" strokeWidth="1" />
                        <rect width="180" height="26" fill="#141414" />
                        <text x="12" y="18" fill="#FFF" fontSize="12" fontFamily="monospace" fontWeight="bold">orders</text>

                        {/* Columns */}
                        <text x="12" y="52" fill="#D2FF00" fontSize="11" fontFamily="monospace">user_id</text>
                        <text x="140" y="52" fill="#D2FF00" fontSize="10" fontFamily="monospace">[FK]</text>
                        <line x1="12" y1="62" x2="168" y2="62" stroke="#222" strokeWidth="1" />

                        <text x="12" y="82" fill="#EEE" fontSize="11" fontFamily="monospace">id</text>
                        <text x="140" y="82" fill="#888" fontSize="10" fontFamily="monospace">INT [PK]</text>
                        <line x1="12" y1="92" x2="168" y2="92" stroke="#222" strokeWidth="1" />

                        <text x="12" y="112" fill="#888" fontSize="10" fontFamily="monospace">total</text>
                        <text x="135" y="112" fill="#555" fontSize="10" fontFamily="monospace">INTEGER</text>
                      </g>
                    </svg>
                  </div>
                )}

                {/* 4. DBML */}
                {activeFormat === 'dbml' && (
                  <div className="w-full text-xs sm:text-[13px] leading-relaxed text-neutral-300 space-y-1">
                    <div>
                      <span className="text-[#D2FF00] font-semibold">Table</span> <span className="text-white font-bold">users</span> {'{'}
                    </div>
                    <div className="pl-5 flex items-center justify-between max-w-md">
                      <span className="text-white">id integer</span>
                      <span className="text-[#D2FF00] font-semibold">[pk, increment]</span>
                    </div>
                    <div className="pl-5 flex items-center justify-between max-w-md">
                      <span className="text-neutral-300">email varchar</span>
                      <span className="text-neutral-400">[not null, unique]</span>
                    </div>
                    <div className="text-neutral-400">{'}'}</div>
                  </div>
                )}

                {/* 5. JSON AST */}
                {activeFormat === 'json' && (
                  <div className="w-full text-[11px] sm:text-xs leading-relaxed text-neutral-300">
                    <pre className="text-neutral-300">
                      {`{
  "tables": [
    {
      "name": "users",
      "fields": [
        { "name": "id", "type": "integer", "pk": true },
        { "name": "email", "type": "varchar", "notNull": true, "unique": true }
      ]
    }
  ]
}`}
                    </pre>
                  </div>
                )}
              </div>

              {/* Bottom Meta Bar */}
              <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-500">
                <span>Deterministic schema serialization</span>
                <span className="text-[#D2FF00]">Zero Data Loss</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
