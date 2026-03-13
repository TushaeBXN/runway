import path from "path";
import { defineConfig } from "prisma/config";
import { createClient } from "@libsql/client/node";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const dbPath = path.resolve(process.cwd(), "runway.db");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: `file:${dbPath}`,
    adapter: () => {
      const libsql = createClient({ url: `file:${dbPath}` });
      return new PrismaLibSql(libsql);
    },
  },
});
