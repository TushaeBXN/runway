import path from "path";
import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";
import { PrismaLibSQL } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createClient(): PrismaClient {
  const dbPath = path.resolve(
    process.env.DATABASE_PATH || path.join(process.cwd(), "runway.db")
  );
  const db = new Database(dbPath);
  const adapter = new PrismaLibSQL(db);
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

export const prisma = globalForPrisma.prisma || createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
