import { z } from 'zod';

export const registerSchema = z.object({
  orgName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

// Logout идемпотентен: refreshToken необязателен (можно разлогиниться и без него), но если передан —
// обязан быть строкой, иначе hashToken() внутри бросал бы 500 на не-строке (ACM-18 L1).
export const logoutSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member'),
});

export default { registerSchema, loginSchema, refreshSchema, logoutSchema, inviteMemberSchema };
