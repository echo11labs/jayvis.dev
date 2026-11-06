'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Copy,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { JayvisBrandIcon } from './Logos';

export function EditorialCTA() {
  const [copied, setCopied] = useState(false);

  const copyCommand = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="cta" className="w-full bg-white text-black border-b border-black select-none">
      {/* Top Banner Strip */}
      <div className="w-full bg-black text-white border-b border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4 font-mono text-xs uppercase font-bold tracking-wider">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-white inline-block animate-pulse" />
            <span>PRODUCTION DATABASE STUDIO // NO ACCOUNTS · NO CREDIT CARDS</span>
          </div>
          <div className="flex items-center gap-6 text-white/80 text-[11px]">
            <span>INSTANT BROWSER SESSION</span>
            <span>100% PRIVATE</span>
            <span>ZERO CLOUD TELEMETRY</span>
          </div>
        </div>
      </div>

      {/* Main High-Impact CTA Block */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 bg-white flex flex-col items-center text-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2.5 border border-black bg-neutral-50 px-3.5 py-1.5 mb-6 font-mono text-xs text-neutral-700 uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <JayvisBrandIcon className="w-4 h-4 shrink-0" />
            <span className="font-bold">INSTANT ACCESS // ZERO SIGNUP</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-medium tracking-[-0.04em] text-black leading-tight mb-6">
            Stop wrestling with bloated database clients.
            <br />
            <span className="text-neutral-500 font-normal">
              Start modeling with architectural clarity.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed mb-10 font-sans">
            Open JayVis in any modern browser. Import existing SQL, explore relationships visually, seed realistic mock rows, and export verified migrations immediately. Your schema never leaves your machine.
          </p>

          {/* Action Triggers */}
          <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-xs font-bold uppercase tracking-wider mb-10">
            <Link
              href="/app"
              className="inline-flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white px-8 py-4 border border-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            >
              <span>Launch Playground Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/app?sample=ecommerce"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-neutral-100 text-black px-6 py-4 border border-black transition-colors"
            >
              <span>Try E-Commerce Sample</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
            </Link>
          </div>

          {/* Offline CLI Quickstart Box */}
          <div className="border border-black bg-neutral-50 p-4 font-mono text-xs max-w-xl mx-auto text-left shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between text-neutral-500 pb-2 mb-2 border-b border-black/15 text-[11px]">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-black" />
                <span className="font-bold text-black uppercase">DEVELOPER QUICKSTART // RUN 100% LOCALLY</span>
              </div>
              <span>TERMINAL</span>
            </div>

            <div className="flex items-center justify-between gap-3 bg-white p-2.5 border border-black">
              <code className="text-black select-all font-mono text-[12px] truncate">
                git clone git@github.com:echo11labs/jayvis.dev.git
              </code>
              <button
                type="button"
                onClick={() => copyCommand('git clone git@github.com:echo11labs/jayvis.dev.git && cd jayvis.dev && npm i && npm run dev')}
                className="px-3 py-1 bg-black text-white hover:bg-neutral-800 text-[10px] font-bold uppercase tracking-wider shrink-0 transition-colors flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-white" />
                    <span>COPIED!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-white" />
                    <span>COPY CLONE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
