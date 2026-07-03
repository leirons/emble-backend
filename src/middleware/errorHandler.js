import { logger } from '../lib/logger.js';
import { AppError } from '../lib/errors.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: 'Маршрут не найден' } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error({ err }, err.message);
    return res.status(err.statusCode).json({ error: { message: err.message, details: err.details } });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({ error: { message: `Ошибка загрузки файла: ${err.message}` } });
  }

  logger.error({ err }, 'Необработанная ошибка');
  const status = err.statusCode || 500;
  res.status(status).json({
    error: { message: status === 500 ? 'Внутренняя ошибка сервера' : err.message },
  });
}

export default { notFoundHandler, errorHandler };
