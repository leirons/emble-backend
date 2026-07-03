export class AppError extends Error {
  constructor(message, statusCode = 400, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const notFound = (message = 'Ресурс не найден') => new AppError(message, 404);
export const unauthorized = (message = 'Требуется авторизация') => new AppError(message, 401);
export const forbidden = (message = 'Доступ запрещён') => new AppError(message, 403);
export const badRequest = (message = 'Некорректный запрос', details) => new AppError(message, 400, details);
export const conflict = (message = 'Конфликт данных') => new AppError(message, 409);
export const tooManyRequests = (message = 'Слишком много запросов') => new AppError(message, 429);

export default AppError;
