export const sendSuccess = (res, data = null, message = 'OK', statusCode = 200, meta) =>
  res.status(statusCode).json({ success: true, message, data, ...(meta ? { meta } : {}) });

export const sendCreated = (res, data, message = 'Created') => sendSuccess(res, data, message, 201);
