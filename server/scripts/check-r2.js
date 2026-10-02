// server/scripts/check-r2.js
// Tests the Cloudflare R2 settings in server/.env without starting the app.
// Run inside server/:   npm run check:r2
import { DeleteObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env, r2KeyProblems } from '../src/config/env.js';

const mask = (v) => (v ? `${v.slice(0, 4)}…${v.slice(-4)} (${v.length} chars)` : '(empty)');
console.log('\nR2 settings read from server/.env');
console.log('  CF_ACCOUNT_ID        ', mask(env.CF_ACCOUNT_ID));
console.log('  CF_ACCESS_KEY_ID     ', mask(env.CF_ACCESS_KEY_ID));
console.log('  CF_SECRET_ACCESS_KEY ', mask(env.CF_SECRET_ACCESS_KEY));
console.log('  CF_BUCKET_NAME       ', env.CF_BUCKET_NAME || '(empty)');
console.log('  CF_PUBLIC_BASE_URL   ', env.CF_PUBLIC_BASE_URL || '(empty)');

if (r2KeyProblems.length) {
  console.log('\n❌ Key format problems:');
  r2KeyProblems.forEach((p) => console.log('   •', p));
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.CF_ACCESS_KEY_ID, secretAccessKey: env.CF_SECRET_ACCESS_KEY },
});

const step = async (label, fn) => {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
    return true;
  } catch (e) {
    const status = e.$metadata?.httpStatusCode;
    const hint = { 403: 'access denied (token has no rights on this bucket)', 404: 'bucket not found', 401: 'keys not recognised' }[status];
    console.log(`  ❌ ${label} → ${status ? `HTTP ${status}` : 'no response'}${hint ? ` — ${hint}` : ''} · ${e.Code || e.name}: ${e.message.split('\n')[0]}`);
    return false;
  }
};

console.log('\nTalking to Cloudflare R2…');
const key = `healthcheck/${Date.now()}.txt`;
const canSee = await step('Bucket reachable', () => s3.send(new HeadBucketCommand({ Bucket: env.CF_BUCKET_NAME })));
const canWrite = await step('Upload a test file', () =>
  s3.send(new PutObjectCommand({ Bucket: env.CF_BUCKET_NAME, Key: key, Body: 'ok', ContentType: 'text/plain' }))
);
if (canWrite) await step('Delete the test file', () => s3.send(new DeleteObjectCommand({ Bucket: env.CF_BUCKET_NAME, Key: key })));

console.log('');
if (canWrite) console.log('🎉 R2 works. Restart the server (Ctrl+C, then npm run dev) and upload again.');
else if (!canSee)
  console.log('👉 This token cannot reach the bucket. Create a NEW R2 token with "Object Read & Write" on this bucket and paste BOTH keys.');
else console.log('👉 The token can see the bucket but cannot write. Give the token "Object Read & Write" (not Read only).');
process.exit(canWrite ? 0 : 1);