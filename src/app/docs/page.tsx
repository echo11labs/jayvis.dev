import { Metadata } from 'next';
import { JayvisDocs } from '@/components/docs/JayvisDocs';

export const metadata: Metadata = {
  title: 'Documentation | Jayvis Database Architecture Playground',
  description: 'Getting started guide, business overview, technical architecture, and zero-egress security model for Jayvis.',
};

export default function DocsPage() {
  return <JayvisDocs />;
}

