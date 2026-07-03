import app from '../../src/app.js';

/**
 * Поднимает Express-приложение на эфемерном порту (0) и возвращает базовый URL и функцию close.
 * Использует тот же app, что и прод (src/app.js), но без вызова listen из index.js.
 */
export async function startTestServer() {
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  return {
    server,
    baseUrl,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/** Небольшая обёртка над fetch: JSON-тело + разобранный ответ. */
export async function api(baseUrl, method, path, { body, headers } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return { status: res.status, json, text, headers: res.headers };
}
