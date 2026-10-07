// server/src/config/env.js
import 'dotenv/config';
import { z } from 'zod';

/**
 * Cleans a pasted key: trims spaces / line breaks and removes wrapping quotes or <angle brackets>.
 * e.g.  "  'a1b2…'  "  →  a1b2…   (a common copy-paste mistake that makes R2 reject the key)
 */
const cleanKey = z
  .string()
  .optional()
  .default('')
  .transform((v) => v.trim().replace(/^(['"`<])(.*)(['"`>])$/s, '$2').trim());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('30d'), // renewed automatically while the user keeps using the app
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(10),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  CF_PUBLIC_BASE_URL: cleanKey,
  CF_ACCOUNT_ID: cleanKey,
  CF_ACCESS_KEY_ID: cleanKey,
  CF_SECRET_ACCESS_KEY: cleanKey,
  CF_BUCKET_NAME: cleanKey,

  // Razorpay keys: RAZORPAY_KEY / RAZORPAY_SECRET (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET also work)
  RAZORPAY_KEY: cleanKey,
  RAZORPAY_SECRET: cleanKey,
  RAZORPAY_KEY_ID: cleanKey,
  RAZORPAY_KEY_SECRET: cleanKey,
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
  PAYMENT_HOLD_MINUTES: z.coerce.number().int().min(5).default(30), // stock reserved while customer pays

  // MotorDesk Garage CRM (auto-garage-crm) — garages registered there are shown to every shop
  GARAGE_CRM_API_URL: cleanKey,   // e.g. https://auto-garage-crm-zrxc.onrender.com
  GARAGE_CRM_API_KEY: cleanKey,   // = EXTERNAL_API_KEY in the Garage CRM server's .env
  GARAGE_CRM_CACHE_MINUTES: z.coerce.number().min(1).default(5),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  for (const issue of parsed.error.issues) console.error(`   ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;
env.RAZORPAY_KEY_ID = env.RAZORPAY_KEY || env.RAZORPAY_KEY_ID;
env.RAZORPAY_KEY_SECRET = env.RAZORPAY_SECRET || env.RAZORPAY_KEY_SECRET;
export const isProd = env.NODE_ENV === 'production';

/*
 * Cloudflare R2 key formats (R2 → Manage R2 API Tokens → Create API token, "S3 client" section):
 *   CF_ACCOUNT_ID         32 hex characters (also in the dashboard URL)
 *   CF_ACCESS_KEY_ID      32 characters  ("Access Key ID")
 *   CF_SECRET_ACCESS_KEY  64 characters  ("Secret Access Key")
 * The "Token value" shown on the same screen is NOT the access key — it is for Cloudflare's own API.
 */
const R2_KEY_RULES = [
  ['CF_ACCOUNT_ID', 32, 'Account ID'],
  ['CF_ACCESS_KEY_ID', 32, 'Access Key ID'],
  ['CF_SECRET_ACCESS_KEY', 64, 'Secret Access Key'],
];
export const r2KeyProblems = R2_KEY_RULES
  .filter(([key, len]) => env[key] && env[key].length !== len)
  .map(([key, len, label]) => `${key} has ${env[key].length} characters, should be ${len} (Cloudflare "${label}")`);

export const isR2Configured = Boolean(
  env.CF_ACCOUNT_ID && env.CF_ACCESS_KEY_ID && env.CF_SECRET_ACCESS_KEY && env.CF_BUCKET_NAME && env.CF_PUBLIC_BASE_URL &&
    r2KeyProblems.length === 0
);
export const isRazorpayConfigured = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
export const isGarageCrmConfigured = Boolean(env.GARAGE_CRM_API_URL && env.GARAGE_CRM_API_KEY);