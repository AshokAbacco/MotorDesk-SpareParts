// server/src/config/prisma.js
import { PrismaClient } from '@prisma/client';
import { isProd } from './env.js';

// Single PrismaClient per process (reused across hot reloads in dev)
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: isProd ? ['error'] : ['warn', 'error'],
    // Checkout / POS / status changes run several queries in one transaction. With a remote database
    // (e.g. a local server talking to Render Postgres) each query can take 0.3–1s, so Prisma's default
    // 5s limit is too tight. maxWait = time to get a connection, timeout = time the transaction may run.
    transactionOptions: { maxWait: 10_000, timeout: 30_000 },
  });

if (!isProd) globalForPrisma.__prisma = prisma;