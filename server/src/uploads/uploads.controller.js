// server/src/uploads/uploads.controller.js
import { z } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { sendCreated, sendSuccess } from '../utils/ApiResponse.js';
import * as uploadsService from './uploads.service.js';

const FOLDERS = { ADMIN: 'products', VENDOR: 'vendors' };

export const uploadImages = async (req, res) => {
  const folder = FOLDERS[req.user.role] ?? 'misc';
  const files = await uploadsService.uploadImages(req.files, folder);
  sendCreated(res, files, 'Uploaded');
};

export const uploadFromUrl = async (req, res) => {
  const parsed = z.object({ url: z.string().trim().url().max(2000) }).safeParse(req.body);
  if (!parsed.success) throw ApiError.badRequest('Paste a full image link starting with https://');
  const file = await uploadsService.uploadFromUrl(parsed.data.url, FOLDERS[req.user.role] ?? 'misc');
  sendCreated(res, file, 'Image added');
};

export const deleteImage = async (req, res) => {
  const parsed = z.object({ url: z.string().url() }).safeParse(req.body);
  if (!parsed.success) throw ApiError.badRequest('A valid url is required');
  await uploadsService.deleteByUrl(parsed.data.url);
  sendSuccess(res, null, 'Deleted');
};