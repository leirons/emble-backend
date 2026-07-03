// Express 4 не перехватывает отклонённые промисы из async-обработчиков автоматически.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export default asyncHandler;
