import type { NextConfig } from "next";
import path from "path";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval in dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com http://localhost:11434 http://localhost:4200",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  experimental: {},
  turbopack: {
    resolveAlias: {
      tailwindcss: path.resolve("./node_modules/tailwindcss"),
    },
  },
  env: {
    DB_URL: `file:${path.resolve(process.cwd(), "runway.db")}`,
  },
  serverExternalPackages: [
    "better-sqlite3",
    "@libsql/client",
    "@prisma/adapter-libsql",
    "@prisma/adapter-better-sqlite3",
    "@anthropic-ai/sdk",
    "ollama",
    "node-cron",
    "imapflow",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
