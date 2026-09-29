import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const themeBoot = `(function(){try{var allowed=["dark-plus","light-plus","dracula","one-dark","github-dark","nord","solarized-dark","monokai-pro","xcode-dark","system"];var t=localStorage.getItem("jayvis-theme")||localStorage.getItem("stitchdb-theme")||"dark-plus";if(allowed.indexOf(t)<0)t="dark-plus";var light=t==="light-plus"||(t==="system"&&window.matchMedia("(prefers-color-scheme: light)").matches);var root=document.documentElement;root.dataset.theme=t;root.dataset.resolvedTheme=light?"light-plus":"dark-plus";root.classList.toggle("light",light);root.classList.toggle("dark",!light);}catch(e){}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "JayVis.dev — Visual Database Schema Studio",
  description:
    "A developer-first database modeling workspace. Bridge declarative DBML and visual ERDs with an AST-driven core, ELK auto-layout, AST diffing, and MCP agent integration.",
  keywords: [
    "JayVis.dev",
    "DBML",
    "ERD",
    "database diagram",
    "schema migration",
    "MCP",
    "dbdiagram",
  ],
  authors: [{ name: "JayVis.dev" }],
  openGraph: {
    title: "JayVis.dev — Visual Database Schema Studio",
    description:
      "Bridge declarative DBML and visual ERDs with an AST-driven core.",
    siteName: "JayVis.dev",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body
        className={`${geistSans.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
