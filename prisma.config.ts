import path from "path";
import { defineConfig } from "prisma/config";
import Database from "better-sqlite3";
import { PrismaLibSQL } from "@prisma/adapter-better-sqlite3";

const dbPath = path.resolve(
  process.env.DATABASE_PATH || path.join(process.cwd(), "runway.db")
);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // url is used by CLI tools (db push, migrate)
    url: `file:${dbPath}`,
    // adapter is used by the runtime PrismaClient
    adapter: () => {
      const db = new Database(dbPath);
      return new PrismaLibSQL(db);
    },
  },
});
