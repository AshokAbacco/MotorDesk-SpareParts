import { S3Client } from '@aws-sdk/client-s3';
import { env, isR2Configured } from './env.js';

// Cloudflare R2 is S3-compatible: same SDK, Cloudflare endpoint, region "auto".
export const r2 = isR2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.CF_ACCESS_KEY_ID,
        secretAccessKey: env.CF_SECRET_ACCESS_KEY,
      },
    })
  : null;

export const R2_BUCKET = env.CF_BUCKET_NAME;
export const R2_PUBLIC_URL = env.CF_PUBLIC_BASE_URL.replace(/\/$/, '');
