// server/src/config/cors.js
import { env } from './env.js';

const allowed = env.CLIENT_URL.split(',').map((u) => u.trim().replace(/\/$/, ''));

export const corsOptions = {
  origin(origin, cb) {
    // allow server-to-server / curl (no origin) and whitelisted clients
    if (!origin || allowed.includes(origin.replace(/\/$/, ''))) return cb(null, true);
    return cb(new Error(`CORS blocked for origin ${origin}`));
  },
  credentials: true,
  // let the browser app read the renewed login token (sliding session, see auth.middleware.js)
  exposedHeaders: ['X-Refresh-Token'],
};