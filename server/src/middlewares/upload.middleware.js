import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

// memoryStorage: file stays in RAM and is streamed to Cloudflare R2 — never written to disk.
export const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED.includes(file.mimetype)) return cb(ApiError.badRequest('Only JPG, PNG, WEBP or AVIF images are allowed'));
    cb(null, true);
  },
});
