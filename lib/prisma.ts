import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url:
          process.env.DATABASE_URL +
          "?pgbouncer=true&connection_limit=10&pool_timeout=20&connect_timeout=10",
      },
    },
    // Add connection pool configuration
    __internal: {
      engine: {
        connectTimeout: 10000, // 10 seconds
        queryTimeout: 30000, // 30 seconds
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
