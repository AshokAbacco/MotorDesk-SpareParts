import { ApiError } from '../utils/ApiError.js';

/**
 * validate({ body: schema, query: schema, params: schema })
 * Parsed body replaces req.body. In Express 5 req.query is a getter, so parsed
 * query/params are stored on req.validQuery / req.validParams.
 */
export const validate = (schemas) => (req, _res, next) => {
  const errors = [];
  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key] ?? {});
    if (!result.success) {
      errors.push(...result.error.issues.map((i) => ({ field: [key, ...i.path].join('.'), message: i.message })));
    } else if (key === 'body') {
      req.body = result.data;
    } else {
      req[key === 'query' ? 'validQuery' : 'validParams'] = result.data;
    }
  }
  if (errors.length) return next(ApiError.badRequest('Validation failed', errors));
  next();
};
