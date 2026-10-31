'use client';

import React from 'react';
import { EditorialNavbar } from '@/components/landing/EditorialNavbar';
import { EditorialHero } from '@/components/landing/EditorialHero';
import { EditorialWorkflow } from '@/components/landing/EditorialWorkflow';
import { CodeAndCanvas } from '@/components/landing/CodeAndCanvas';
import { EditorialCapabilities } from '@/components/landing/EditorialCapabilities';
import { EditorialShowcase } from '@/components/landing/EditorialShowcase';
import { SchemaExports } from '@/components/landing/SchemaExports';
import { EditorialInfrastructure } from '@/components/landing/EditorialInfrastructure';
import { StartWithSchema } from '@/components/landing/StartWithSchema';
import { EditorialFooter } from '@/components/landing/EditorialFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white antialiased selection:bg-[#D2FF00] selection:text-black font-sans">
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

      {/* 07. Take Your Schema Further (Tabbed Export Showcase) */}
      <SchemaExports />

      {/* 08. Air-Gapped Security & Enterprise Privacy Matrix */}
      <EditorialInfrastructure />

      {/* 09. Final Section: Start with a Schema */}
      <StartWithSchema />

      {/* 10. Compact Utilitarian Footer */}
      <EditorialFooter />
    </div>
  );
}
