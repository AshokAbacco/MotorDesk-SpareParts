import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Resolves the logged-in vendor's shop and attaches req.vendorId / req.vendor.
 * Every vendor-scoped query MUST use req.vendorId — never a vendorId from the body.
 * Use { requireApproved: false } for routes a pending vendor may still access (e.g. own profile).
 */
export const attachTenant = ({ requireApproved = true } = {}) => async (req, _res, next) => {
  const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
  if (!vendor) return next(ApiError.forbidden('No shop linked to this account'));
  if (requireApproved && vendor.status !== 'APPROVED') {
    return next(ApiError.forbidden(`Shop is ${vendor.status.toLowerCase()}. Wait for admin approval.`));
  }
  req.vendor = vendor;
  req.vendorId = vendor.id;
  next();
};
