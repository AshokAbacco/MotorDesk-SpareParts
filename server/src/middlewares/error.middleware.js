import { Prisma } from '@prisma/client';
import multer from 'multer';
import { isProd } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let error = err;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') error = ApiError.conflict(`Duplicate value for ${err.meta?.target ?? 'field'}`);
    else if (err.code === 'P2025') error = ApiError.notFound('Record not found');
    else if (err.code === 'P2003') error = ApiError.badRequest('Related record does not exist or is still in use');
  } else if (err instanceof multer.MulterError) {
    error = ApiError.badRequest(err.message);
  } else if (err?.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Invalid JSON body');
  }

  const status = error.statusCode || 500;
  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err);

  res.status(status).json({
    success: false,
    message: status >= 500 && isProd ? 'Something went wrong' : error.message,
    ...(error.details ? { errors: error.details } : {}),
    ...(!isProd && status >= 500 ? { stack: err.stack } : {}),
  });
}
