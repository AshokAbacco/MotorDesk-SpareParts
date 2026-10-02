// Express 5 forwards rejected promises automatically; this wrapper keeps
// controllers explicit and works if you ever downgrade to Express 4.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
