/**
 * Утилиты для Server-Sent Events (SSE) — стриминг ответа ассистента виджету.
 *
 * Вынесено из контроллера, чтобы:
 *  - централизовать корректное экранирование фреймов (многострочные данные, JSON);
 *  - гарантировать, что запись после закрытия соединения не роняет процесс;
 *  - слать keep-alive комментарии, чтобы промежуточные прокси не рвали «тихое» соединение,
 *    пока LLM только «думает» и ещё не прислала первый токен;
 *  - покрыть форматирование фреймов юнит-тестами без реального сокета.
 */

/**
 * Форматирует один SSE-фрейм. Многострочные данные разбиваются на несколько `data:` строк,
 * как того требует спецификация SSE. `data` сериализуется в JSON.
 * @param {string} event
 * @param {any} data
 * @returns {string}
 */
export function formatSSEFrame(event, data) {
  const json = JSON.stringify(data === undefined ? {} : data);
  // JSON.stringify не выдаёт '\n' внутри строки как реальный перевод строки, но на случай
  // будущих сырых данных разбиваем по \n, чтобы фрейм всегда оставался валидным.
  const dataLines = json.split('\n').map((line) => `data: ${line}`).join('\n');
  return `event: ${event}\n${dataLines}\n\n`;
}

/**
 * Открывает SSE-канал поверх Express res. Возвращает безопасные send/close.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{ keepAliveMs?: number }} [opts]
 */
export function createSSEChannel(req, res, opts = {}) {
  const keepAliveMs = opts.keepAliveMs ?? 15000;
  let closed = false;
  let keepAlive = null;

  const cleanup = () => {
    if (keepAlive) {
      clearInterval(keepAlive);
      keepAlive = null;
    }
  };

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // отключаем буферизацию на nginx-подобных прокси
  });
  res.flushHeaders?.();

  // Клиент ушёл со страницы / закрыл вкладку — прекращаем писать.
  req.on('close', () => {
    closed = true;
    cleanup();
  });

  const send = (event, data) => {
    if (closed || res.writableEnded) return false;
    try {
      res.write(formatSSEFrame(event, data));
      return true;
    } catch {
      // Сокет мог закрыться между проверкой и записью — не даём этому уронить обработчик.
      closed = true;
      cleanup();
      return false;
    }
  };

  // Комментарий-пинг: строка, начинающаяся с ':' — валидный no-op фрейм по спеке SSE.
  const ping = () => {
    if (closed || res.writableEnded) return;
    try {
      res.write(': keep-alive\n\n');
    } catch {
      closed = true;
      cleanup();
    }
  };

  if (keepAliveMs > 0) {
    keepAlive = setInterval(ping, keepAliveMs);
    keepAlive.unref?.(); // пинг не должен держать процесс живым сам по себе
  }

  const close = () => {
    cleanup();
    if (!closed && !res.writableEnded) {
      closed = true;
      res.end();
    }
  };

  return {
    send,
    ping,
    close,
    get closed() {
      return closed;
    },
  };
}

export default { formatSSEFrame, createSSEChannel };
