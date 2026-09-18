import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StitchDB — Visual Database Schema Studio",
  description:
    "A developer-first database modeling workspace. Bridge declarative DBML and visual ERDs with an AST-driven core, ELK auto-layout, AST diffing, and MCP agent integration.",
  keywords: [
    "StitchDB",
    "DBML",
    "ERD",
    "database diagram",
    "schema migration",
    "MCP",
    "dbdiagram",
  ],
  authors: [{ name: "StitchDB" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "StitchDB — Visual Database Schema Studio",
    description:
      "Bridge declarative DBML and visual ERDs with an AST-driven core.",
    siteName: "StitchDB",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100`}
      >
        {children}
        <Toaster richColors theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
