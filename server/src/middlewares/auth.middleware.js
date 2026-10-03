// server/src/middlewares/auth.middleware.js
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken, verifyToken } from '../utils/jwt.js';

export const REFRESH_HEADER = 'X-Refresh-Token';

/**
 * Requires a valid Bearer token; attaches req.user.
 * Sliding session: once a token is past half its lifetime, a fresh one is sent back in the X-Refresh-Token
 * header and the app swaps it in — so anyone who keeps using the app stays logged in until they log out.
 */
export async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(ApiError.unauthorized('Login required'));

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return next(ApiError.unauthorized('Session expired, please login again'));
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return next(ApiError.unauthorized('Account not found or disabled'));

  req.user = user;

  if (payload.iat && payload.exp) {
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp - now < (payload.exp - payload.iat) / 2) {
      res.setHeader(REFRESH_HEADER, signToken({ sub: user.id, role: user.role }));
    }
  }
  next();
}