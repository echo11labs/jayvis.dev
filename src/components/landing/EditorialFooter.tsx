import React from 'react';
import Link from 'next/link';

export function EditorialFooter() {
  return (
    <footer className="w-full bg-black text-white border-t border-neutral-800/80 py-8 sm:py-10 select-none">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          {/* Brand & Descriptor */}
          <div className="space-y-1">
            <div className="font-bold text-base sm:text-lg tracking-tight text-white font-sans">
              JayVis<span className="text-[#D2FF00]">.</span>dev
            </div>
            <p className="font-mono text-xs text-neutral-500">
              Database schema studio.
            </p>
          </div>

          {/* Utilitarian Navigation Links */}
          <div className="flex items-center gap-6 font-mono text-xs">
            <Link
              href="/app"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Open Studio
            </Link>
            <span className="text-neutral-700" aria-hidden="true">·</span>
            <a
              href="https://github.com/echo11labs/jayvis.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}