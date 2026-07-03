import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import * as usersRepo from './users.repo.js';
import * as tokensRepo from './tokens.repo.js';
import * as orgsRepo from '../organizations/organizations.repo.js';
import * as subsRepo from '../billing/subscriptions.repo.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import { AppError, conflict, unauthorized } from '../../lib/errors.js';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней, держим в синхроне с JWT_REFRESH_TTL

function issueTokenPair(user) {
  const payload = { sub: user.id, orgId: user.orgId, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  return { accessToken, refreshToken };
}

async function persistRefreshToken(userId, refreshToken) {
  await tokensRepo.storeRefreshToken({
    id: uuid(),
    userId,
    token: refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
}

export async function register({ orgName, email, password }) {
  const existing = await usersRepo.getUserByEmail(email);
  if (existing) throw conflict('Пользователь с таким email уже зарегистрирован');

  const orgId = uuid();
  const userId = uuid();
  const passwordHash = await bcrypt.hash(password, 10);

  await orgsRepo.insertOrganization({ id: orgId, name: orgName, planId: 'free' });
  const user = await usersRepo.insertUser({ id: userId, orgId, email, passwordHash, role: 'owner' });
  await subsRepo.createSubscription({ orgId, planId: 'free' });

  const tokens = issueTokenPair(user);
  await persistRefreshToken(user.id, tokens.refreshToken);

  return { user: { id: user.id, orgId: user.orgId, email: user.email, role: user.role }, ...tokens };
}

export async function login({ email, password }) {
  const user = await usersRepo.getUserByEmail(email);
  if (!user) throw unauthorized('Неверный email или пароль');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw unauthorized('Неверный email или пароль');

  const tokens = issueTokenPair(user);
  await persistRefreshToken(user.id, tokens.refreshToken);

  return { user: { id: user.id, orgId: user.orgId, email: user.email, role: user.role }, ...tokens };
}

export async function refresh({ refreshToken }) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw unauthorized('Недействительный refresh-токен');
  }

  const stored = await tokensRepo.findValidRefreshToken(refreshToken);
  if (!stored || stored.userId !== payload.sub) {
    throw unauthorized('Refresh-токен отозван или не найден');
  }

  const user = await usersRepo.getUserById(payload.sub);
  if (!user) throw unauthorized('Пользователь не найден');

  // Ротация: старый токен отзываем, выдаём новую пару.
  await tokensRepo.revokeRefreshToken(refreshToken);
  const tokens = issueTokenPair(user);
  await persistRefreshToken(user.id, tokens.refreshToken);

  return { user, ...tokens };
}

export async function logout({ refreshToken }) {
  if (refreshToken) await tokensRepo.revokeRefreshToken(refreshToken);
}

export async function me(userId) {
  const user = await usersRepo.getUserById(userId);
  if (!user) throw new AppError('Пользователь не найден', 404);
  return user;
}

export default { register, login, refresh, logout, me };
