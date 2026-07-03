import Stripe from 'stripe';
import * as subsRepo from './subscriptions.repo.js';
import * as orgsRepo from '../organizations/organizations.repo.js';
import { env } from '../../config/env.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

let stripeClient;
function getStripe() {
  if (!env.stripe.secretKey) return null;
  if (!stripeClient) stripeClient = new Stripe(env.stripe.secretKey);
  return stripeClient;
}

// Stripe Price ID нужно завести в дашборде Stripe и подставить сюда/в env при интеграции.
const PLAN_STRIPE_PRICE = {
  pro: process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS,
};

export async function listPlans() {
  return subsRepo.listPlans();
}

export async function getMySubscription(orgId) {
  const subscription = await subsRepo.getSubscriptionByOrg(orgId);
  if (!subscription) throw notFound('Подписка не найдена');
  const plan = await subsRepo.getPlan(subscription.planId);
  return { subscription, plan };
}

/**
 * Создаёт Stripe Checkout Session для апгрейда тарифа. Требует STRIPE_SECRET_KEY
 * и настроенные Price ID (STRIPE_PRICE_PRO/STRIPE_PRICE_BUSINESS) в окружении.
 */
export async function createCheckoutSession(orgId, planId) {
  const stripe = getStripe();
  if (!stripe) throw badRequest('Биллинг не сконфигурирован (нет STRIPE_SECRET_KEY)');

  const priceId = PLAN_STRIPE_PRICE[planId];
  if (!priceId) throw badRequest(`Нет Stripe Price ID для тарифа "${planId}"`);

  const org = await orgsRepo.getOrganizationById(orgId);
  if (!org) throw notFound('Организация не найдена');

  const subscription = await subsRepo.getSubscriptionByOrg(orgId);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer: subscription?.billingCustomerId || undefined,
    client_reference_id: orgId,
    success_url: `${env.appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.appUrl}/billing/cancel`,
    metadata: { orgId, planId },
    // Stripe НЕ копирует metadata сессии в объект Subscription. Дублируем orgId/planId
    // в subscription_data, чтобы вебхук customer.subscription.deleted мог найти орг. (ACM-16)
    subscription_data: { metadata: { orgId, planId } },
  });

  return { checkoutUrl: session.url };
}

/**
 * Определяет orgId для события customer.subscription.deleted.
 * Приоритет — metadata.orgId (проставляется через subscription_data при checkout),
 * fallback — поиск подписки по billing_customer_id (для подписок, созданных до фикса ACM-16,
 * у которых metadata пустая). Тестируемая функция: lookupByCustomerId инжектируется.
 */
export async function resolveDeletedSubscriptionOrgId(sub, lookupByCustomerId) {
  const fromMetadata = sub?.metadata?.orgId;
  if (fromMetadata) return fromMetadata;
  const customerId = sub?.customer;
  if (!customerId) return null;
  const existing = await lookupByCustomerId(customerId);
  return existing?.orgId || null;
}

/**
 * Обработка вебхуков Stripe. Роут должен получать raw body (см. index.js).
 */
export async function handleStripeWebhook(rawBody, signature) {
  const stripe = getStripe();
  if (!stripe) throw badRequest('Биллинг не сконфигурирован');

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.stripe.webhookSecret);
  } catch (err) {
    logger.error({ err }, 'Неверная подпись Stripe webhook');
    throw badRequest('Неверная подпись webhook');
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const orgId = session.client_reference_id || session.metadata?.orgId;
      const planId = session.metadata?.planId;
      if (orgId && planId) {
        // Раньше сюда передавался null и обнулял current_period_end (ACM-18 L3). Тянем реальный
        // конец периода из подписки Stripe; при неудаче COALESCE в репозитории сохранит прежнее значение.
        let currentPeriodEnd = null;
        if (session.subscription) {
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription);
            if (sub?.current_period_end) currentPeriodEnd = new Date(sub.current_period_end * 1000);
          } catch (err) {
            logger.warn({ err, orgId }, 'Не удалось получить current_period_end из Stripe, сохраняем прежнее');
          }
        }
        await subsRepo.updateSubscriptionFromStripe({
          orgId,
          billingCustomerId: session.customer,
          status: 'active',
          currentPeriodEnd,
          planId,
        });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const orgId = await resolveDeletedSubscriptionOrgId(sub, subsRepo.getSubscriptionByCustomerId);
      if (orgId) {
        await subsRepo.updateSubscriptionFromStripe({
          orgId,
          billingCustomerId: sub.customer,
          status: 'canceled',
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          planId: 'free',
        });
      } else {
        logger.warn({ customer: sub.customer }, 'ACM-16: не удалось определить orgId для отменённой подписки');
      }
      break;
    }
    default:
      logger.debug({ type: event.type }, 'Необработанный тип Stripe-события');
  }

  return { received: true };
}

export default { listPlans, getMySubscription, createCheckoutSession, handleStripeWebhook };
