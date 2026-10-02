// server/src/uploads/uploads.service.js
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { r2KeyProblems } from '../config/env.js';
import { R2_BUCKET, R2_PUBLIC_URL, r2 } from '../config/r2.js';
import { ApiError } from '../utils/ApiError.js';
import { downloadImage } from './remoteImage.js';

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'application/pdf': 'pdf' };

function ensureR2() {
  if (!r2) {
    throw new ApiError(503, r2KeyProblems.length
      ? `Image upload is off: ${r2KeyProblems[0]}. Fix it in server/.env and restart the server.`
      : 'File storage is not configured. Fill the CF_* values in server/.env');
  }
}

/** Turns Cloudflare R2 errors into messages that say what to fix (instead of a bare 500) */
function explainR2Error(err) {
  const code = err?.Code || err?.name;
  const fixes = {
    AccessDenied: `Cloudflare R2 denied access to bucket "${R2_BUCKET}". In Cloudflare → R2 → Manage API Tokens, edit the token and give it "Object Read & Write" on this bucket.`,
    NoSuchBucket: `Cloudflare R2 bucket "${R2_BUCKET}" does not exist. Check CF_BUCKET_NAME in server/.env.`,
    InvalidAccessKeyId: 'Cloudflare R2 does not recognise CF_ACCESS_KEY_ID. Copy the Access Key ID again from Cloudflare.',
    SignatureDoesNotMatch: 'CF_SECRET_ACCESS_KEY does not match CF_ACCESS_KEY_ID. Copy the Secret Access Key again from Cloudflare.',
  };
  if (fixes[code]) return new ApiError(502, `Image upload failed: ${fixes[code]}`);
  return err;
}

/** Uploads a buffer to Cloudflare R2 and returns its public URL. Nothing touches local disk. */
export async function uploadBuffer({ buffer, mimetype, folder = 'misc', fileName }) {
  ensureR2();
  const now = new Date();
  const key = `${folder}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${
    fileName ?? `${randomUUID()}.${EXT[mimetype] ?? 'bin'}`
  }`;

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
  } catch (err) {
    throw explainR2Error(err);
  }
  return { key, url: `${R2_PUBLIC_URL}/${key}` };
}

export async function uploadImages(files, folder) {
  if (!files?.length) throw ApiError.badRequest('No files uploaded');
  return Promise.all(files.map((f) => uploadBuffer({ buffer: f.buffer, mimetype: f.mimetype, folder })));
}

/** "Add from URL": downloads a public image link and stores our own copy in R2 */
export async function uploadFromUrl(url, folder) {
  ensureR2();
  const { buffer, mimetype } = await downloadImage(url);
  return uploadBuffer({ buffer, mimetype, folder });
}

/** Deletes an object by its public URL (only if it belongs to our bucket) */
export async function deleteByUrl(url) {
  ensureR2();
  if (!url?.startsWith(`${R2_PUBLIC_URL}/`)) throw ApiError.badRequest('URL does not belong to this storage');
  const key = url.slice(R2_PUBLIC_URL.length + 1);
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })).catch((err) => { throw explainR2Error(err); });
}