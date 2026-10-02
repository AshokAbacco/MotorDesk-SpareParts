import { ApiError } from '../utils/ApiError.js';

/** authorize('ADMIN') or authorize('ADMIN', 'VENDOR') */
export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden('You do not have access to this resource'));
  next();
};
