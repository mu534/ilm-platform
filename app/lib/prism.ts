import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

// Singleton guard for Next.js development hot reload.
// Without this, each hot-reload creates a new PrismaClient instance,
// which exhausts the database connection pool.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  // connection_limit=5 prevents pool exhaustion on cold start in dev
  const url = connectionString.includes("connection_limit")
    ? connectionString
    : connectionString + (connectionString.includes("?") ? "&" : "?") + "connection_limit=5&pool_timeout=10";
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
