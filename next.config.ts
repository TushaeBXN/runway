import type { NextConfig } from "next";
import path from "path";

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
  ],
};

export default nextConfig;
