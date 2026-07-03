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
  });

  return { checkoutUrl: session.url };
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
        await subsRepo.updateSubscriptionFromStripe({
          orgId,
          billingCustomerId: session.customer,
          status: 'active',
          currentPeriodEnd: null,
          planId,
        });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const orgId = sub.metadata?.orgId;
      if (orgId) {
        await subsRepo.updateSubscriptionFromStripe({
          orgId,
          billingCustomerId: sub.customer,
          status: 'canceled',
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          planId: 'free',
        });
      }
      break;
    }
    default:
      logger.debug({ type: event.type }, 'Необработанный тип Stripe-события');
  }

  return { received: true };
}

export default { listPlans, getMySubscription, createCheckoutSession, handleStripeWebhook };
