import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  env: {
    DB_URL: `file:${path.resolve(process.cwd(), "runway.db")}`,
  },
  // Prevent Turbopack from bundling native SQLite modules
  serverExternalPackages: [
    "better-sqlite3",
    "@libsql/client",
    "@prisma/adapter-libsql",
    "@prisma/adapter-better-sqlite3",
  ],
};

export default nextConfig;
