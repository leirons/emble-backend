import * as usageRepo from './usage.repo.js';
import * as subsRepo from '../billing/subscriptions.repo.js';
import { tooManyRequests } from '../../lib/errors.js';

/**
 * Проверяет, не превышен ли месячный лимит сообщений по тарифу организации.
 * Вызывается перед обработкой сообщения в чате (до траты токенов LLM).
 */
export async function assertWithinMessageLimit(orgId) {
  const subscription = await subsRepo.getSubscriptionByOrg(orgId);
  const plan = await subsRepo.getPlan(subscription?.planId || 'free');
  const usage = await usageRepo.getCurrentUsage(orgId);

  if (plan && usage.messagesCount >= plan.messageLimit) {
    throw tooManyRequests(
      `Лимит сообщений по тарифу "${plan.name}" исчерпан (${plan.messageLimit}/мес). Обновите тариф.`
    );
  }
  return { plan, usage };
}

export async function recordMessageUsage(orgId, tokensUsed) {
  return usageRepo.incrementUsage(orgId, tokensUsed);
}

export default { assertWithinMessageLimit, recordMessageUsage };
