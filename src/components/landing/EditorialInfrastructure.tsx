'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  ExternalLink,
  Check,
  Cpu,
  WifiOff,
  FileCode2,
} from 'lucide-react';
import { ClaudeLogo, CursorLogo } from './Logos';

const SECURITY_CLEARANCES = [
  {
    num: '01',
    icon: ShieldCheck,
    title: 'Zero Server Ingestion (SOC2 / HIPAA Safe)',
    description: 'Parses and renders schema syntax entirely inside your browser memory heap. No remote servers ever ingest, log, or index your table structures or column names.',
  },
  {
    num: '02',
    icon: Lock,
    title: 'No Production Credentials Required',
    description: 'Model database schemas purely from declarative code or DDL dumps. Never expose live database credentials, production passwords, or SSH tunnels.',
  },
  {
    num: '03',
    icon: Cpu,
    title: 'Local Model Context Protocol (MCP)',
    description: 'AI coding assistants interface with your schema AST over a strictly local Unix stdio pipe. No intermediate cloud proxy or third-party API leakage.',
  },
  {
    num: '04',
    icon: WifiOff,
    title: 'Air-Gapped Network Isolation',
    description: 'Operates with zero internet connectivity. Fully functional on offline flights, restricted banking environments, and isolated enterprise intranets.',
  },
  {
    num: '05',
    icon: FileCode2,
    title: 'Transparent Client Architecture',
    description: 'Full client-side transparency with zero analytics cookies, tracking beacons, or telemetry backdoors.',
  },
];

export function EditorialInfrastructure() {
  const [activeClearance, setActiveClearance] = useState<string>('01');

  return (
    <section id="security" className="w-full bg-black text-white border-t border-neutral-800/80 select-none">
      {/* Header Band */}
      <div className="border-b border-neutral-800 px-4 sm:px-6 lg:px-8 py-16 sm:py-20 bg-black">
        <div className="max-w-[1240px] mx-auto">
          {/* Eyebrow - Pure typography, no badge container */}
          <p className="font-mono text-xs sm:text-[13px] font-semibold tracking-[0.2em] uppercase text-[#D2FF00] mb-3">
            ENTERPRISE PRIVACY &amp; SECURITY // ZERO SERVER TELEMETRY
          </p>

          <div className="max-w-3xl">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Why security and data teams approve JayVis.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-neutral-400 font-sans leading-relaxed">
              Production schemas often contain proprietary architectures and sensitive column definitions. JayVis runs completely client-side in browser memory—never transmitting your schema or credentials over the network.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Clean Security Clearance List (5 cols) & MCP Architectural Schematic (7 cols) */}
      <div className="w-full bg-[#080808]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="border border-neutral-800 bg-[#0c0c0c] rounded-none grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-neutral-800 overflow-hidden">
            {/* Left Column (5 cols): Security Principles List */}
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-[#0c0c0c]">
              <div>
                <div className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-4 pb-2 border-b border-neutral-800">
                  SECURITY VERIFICATIONS
                </div>

                <div className="space-y-3 font-mono text-xs">
                  {SECURITY_CLEARANCES.map((sec) => {
                    const isActive = activeClearance === sec.num;
                    const ClearanceIcon = sec.icon;
                    return (
                      <div
                        key={sec.num}
                        onClick={() => setActiveClearance(sec.num)}
                        className={`p-4 border transition-colors cursor-pointer rounded-none ${
                          isActive
                            ? 'bg-[#181818] border-[#D2FF00] text-white shadow-[0_2px_12px_rgba(210,255,0,0.12)]'
                            : 'bg-[#080808] border-neutral-800/80 text-neutral-400 hover:text-white hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2.5 font-bold uppercase">
                            <ClearanceIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#D2FF00]' : 'text-neutral-500'}`} />
                            <span className={isActive ? 'text-[#D2FF00]' : 'text-neutral-500'}>
                              {sec.num}.
                            </span>
                            <span className={isActive ? 'text-white' : 'text-neutral-300'}>{sec.title}</span>
                          </div>
                          {isActive && (
                            <Check className="w-3.5 h-3.5 text-[#D2FF00] shrink-0" />
                          )}
                        </div>
                        <p className={`text-[11px] leading-relaxed font-sans ${
                          isActive ? 'text-neutral-300' : 'text-neutral-500'
                        }`}>
                          {sec.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-neutral-800 flex flex-wrap items-center gap-3">
                <a
                  href="https://github.com/echo11labs/jayvis.dev"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#141414] text-neutral-300 hover:text-white hover:bg-neutral-800 font-mono text-xs font-bold uppercase tracking-wider transition-colors border border-neutral-800 rounded-none"
                >
                  <span>Audit Source on GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#D2FF00]" />
                </a>
              </div>
            </div>

            {/* Right Column (7 cols): High-Resolution Framed MCP Schematic */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-[#070707]">
              <div>
                <div className="flex items-center justify-between font-mono text-xs text-neutral-400 uppercase tracking-wider mb-4 pb-2 border-b border-neutral-800">
                  <span>LOCAL MODEL CONTEXT PROTOCOL (MCP) BOUNDARY</span>
                  <span className="text-[#D2FF00] font-bold">AIR-GAPPED BY DESIGN</span>
                </div>

                <div className="border border-neutral-800 p-4 bg-[#030303] overflow-hidden mb-4 rounded-none">
                  <img
                    src="/diagrams/mcp-architecture.jpg"
                    alt="Model Context Protocol Local Architecture & Zero Telemetry Boundary"
                    className="w-full h-auto object-contain max-h-[440px] block mx-auto invert hue-rotate-180 brightness-90 contrast-125"
                  />
                </div>

                {/* Verified Agent Compatibility Strip */}
                <div className="flex flex-wrap items-center gap-2 mb-4 p-2.5 bg-[#0f0f0f] border border-neutral-800 font-mono text-[11px]">
                  <span className="font-bold uppercase text-neutral-400 mr-1">VERIFIED LOCAL AGENTS:</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-black text-white border border-neutral-700 text-[10px] font-bold">
                    <ClaudeLogo className="w-3 h-3 text-[#D2FF00]" />
                    <span>Claude Desktop</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-black text-white border border-neutral-700 text-[10px] font-bold">
                    <CursorLogo className="w-3 h-3 text-[#D2FF00]" />
                    <span>Cursor IDE</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#181818] text-neutral-300 text-[10px] font-bold border border-neutral-800">
                    <span>Stdio Protocol v1.0</span>
                  </span>
                </div>

                {/* Concise Architecture Spec Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[11px]">
                  <div className="p-3 border border-neutral-800 bg-[#0c0c0c] rounded-none">
                    <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">BOUNDARY</div>
                    <div className="font-bold text-white">Zero Remote Calls</div>
                    <div className="text-[10px] text-neutral-400 mt-1 font-sans">Air-gapped memory space</div>
                  </div>
                  <div className="p-3 border border-neutral-800 bg-[#0c0c0c] rounded-none">
                    <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">PROTOCOL</div>
                    <div className="font-bold text-[#D2FF00]">Local MCP Stdio Pipe</div>
                    <div className="text-[10px] text-neutral-400 mt-1 font-sans">Direct agent tool calls</div>
                  </div>
                  <div className="p-3 border border-neutral-800 bg-[#0c0c0c] rounded-none">
                    <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">STORAGE</div>
                    <div className="font-bold text-white">Browser IndexedDB</div>
                    <div className="text-[10px] text-neutral-400 mt-1 font-sans">Persistent offline schemas</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-neutral-400">
                <span>CLIENT PRIVACY SPECIFICATION</span>
                <span className="font-bold text-[#D2FF00]">100% PRIVATE BY DEFAULT // ZERO TELEMETRY</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
