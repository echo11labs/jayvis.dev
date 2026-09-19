import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["127.0.0.1", "localhost", "http://127.0.0.1:81"],
  // Keep heavy server-only packages out of the client/edge bundles so
  // Turbopack never has to parse their (very large) source. They are
  // required at runtime from node_modules instead.
  serverExternalPackages: [
    "@modelcontextprotocol/sdk",
    "@dbml/core",
    "@dbml/parse",
  ],
};

export default nextConfig;
