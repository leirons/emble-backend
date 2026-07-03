import { z } from 'zod';

// Верхние границы длины входных строк (ACM-30). z.string().email() проверяет ТОЛЬКО формат и не
// ограничивает длину, поэтому валидный по виду e-mail мог быть сколь угодно большим (до лимита тела
// в 1 МБ) и уходил в неограниченную колонку `email TEXT` — вектор для раздувания БД. Задаём явные max.
const MAX_EMAIL = 254; // RFC 5321: максимальная длина адреса
const MAX_PASSWORD = 72; // bcrypt обрезает пароль на 72 байтах — принимать длиннее нет смысла
const MAX_TOKEN = 1024; // refresh-токен — это JWT (сотни символов); с запасом ограничиваем сверху

export const registerSchema = z.object({
  orgName: z.string().min(2).max(120),
  email: z.string().max(MAX_EMAIL).email(),
  password: z.string().min(8).max(MAX_PASSWORD),
});

export const loginSchema = z.object({
  email: z.string().max(MAX_EMAIL).email(),
  password: z.string().min(1).max(MAX_PASSWORD),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10).max(MAX_TOKEN),
});

// Logout идемпотентен: refreshToken необязателен (можно разлогиниться и без него), но если передан —
// обязан быть строкой, иначе hashToken() внутри бросал бы 500 на не-строке (ACM-18 L1).
export const logoutSchema = z.object({
  refreshToken: z.string().min(10).max(MAX_TOKEN).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().max(MAX_EMAIL).email(),
  role: z.enum(['admin', 'member']).default('member'),
});

export default { registerSchema, loginSchema, refreshSchema, logoutSchema, inviteMemberSchema };
