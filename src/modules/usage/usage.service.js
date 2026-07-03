import * as usageRepo from './usage.repo.js';
import * as subsRepo from '../billing/subscriptions.repo.js';
import { tooManyRequests } from '../../lib/errors.js';

// Fail-closed fallback, если тариф не найден (getPlan вернул null): применяем самый строгий,
// бесплатный лимит из миграции 001_init.sql (plans.free.message_limit = 200), а не «безлимит».
const FREE_MESSAGE_LIMIT = 200;

/**
 * Проверяет, не превышен ли месячный лимит сообщений по тарифу организации.
 * Вызывается перед обработкой сообщения в чате (до траты токенов LLM).
 */
export async function assertWithinMessageLimit(orgId) {
  const subscription = await subsRepo.getSubscriptionByOrg(orgId);
  const plan = await subsRepo.getPlan(subscription?.planId || 'free');
  const usage = await usageRepo.getCurrentUsage(orgId);

  // Раньше при plan === null проверка пропускалась и лимит «отваливался» в open (безлимит).
  // Теперь fail-closed: неизвестный тариф падает на бесплатный лимит (ACM-18 M4).
  const messageLimit = plan?.messageLimit ?? FREE_MESSAGE_LIMIT;
  const planName = plan?.name || 'Free';

  if (usage.messagesCount >= messageLimit) {
    throw tooManyRequests(
      `Лимит сообщений по тарифу "${planName}" исчерпан (${messageLimit}/мес). Обновите тариф.`
    );
  }
  return { plan, usage };
}

export async function recordMessageUsage(orgId, tokensUsed) {
  return usageRepo.incrementUsage(orgId, tokensUsed);
}

export default { assertWithinMessageLimit, recordMessageUsage };
