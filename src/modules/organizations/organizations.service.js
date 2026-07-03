import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import * as orgsRepo from './organizations.repo.js';
import * as usersRepo from '../auth/users.repo.js';
import * as subsRepo from '../billing/subscriptions.repo.js';
import { notFound, conflict } from '../../lib/errors.js';

export async function getMyOrganization(orgId) {
  const org = await orgsRepo.getOrganizationById(orgId);
  if (!org) throw notFound('Организация не найдена');
  const subscription = await subsRepo.getSubscriptionByOrg(orgId);
  const plan = subscription ? await subsRepo.getPlan(subscription.planId) : null;
  return { ...org, subscription, plan };
}

export async function listMembers(orgId) {
  return usersRepo.listUsersByOrg(orgId);
}

/**
 * Приглашает участника в команду. В MVP без email-рассылки: генерируем временный
 * пароль и возвращаем его владельцу/админу, который пригласил — в проде это письмо.
 */
export async function inviteMember(orgId, { email, role }) {
  const existing = await usersRepo.getUserByEmail(email);
  if (existing) throw conflict('Пользователь с таким email уже существует');

  const tempPassword = crypto.randomBytes(9).toString('base64url');
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const user = await usersRepo.insertUser({ id: uuid(), orgId, email, passwordHash, role });

  return { user, tempPassword };
}

export async function removeMember(orgId, userId, requesterId) {
  if (userId === requesterId) throw conflict('Нельзя удалить самого себя');
  await usersRepo.deleteUser(userId, orgId);
}

export default { getMyOrganization, listMembers, inviteMember, removeMember };
