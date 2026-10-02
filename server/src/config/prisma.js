import { PrismaClient } from '@prisma/client';
import { isProd } from './env.js';

// Single PrismaClient per process (reused across hot reloads in dev)
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({ log: isProd ? ['error'] : ['warn', 'error'] });

if (!isProd) globalForPrisma.__prisma = prisma;
