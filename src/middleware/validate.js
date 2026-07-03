import { badRequest } from '../lib/errors.js';

/**
 * Валидирует req[part] по zod-схеме и заменяет его разобранным значением.
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} part
 */
export function validate(schema, part = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return next(badRequest('Ошибка валидации', result.error.flatten()));
    }
    req[part] = result.data;
    next();
  };
}

export default validate;
