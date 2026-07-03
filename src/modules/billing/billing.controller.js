import * as service from './billing.service.js';
import { badRequest } from '../../lib/errors.js';

export async function listPlans(req, res) {
  const plans = await service.listPlans();
  res.json({ plans });
}

export async function getMySubscription(req, res) {
  const result = await service.getMySubscription(req.auth.orgId);
  res.json(result);
}

export async function checkout(req, res) {
  const { planId } = req.body;
  if (!planId) throw badRequest('planId обязателен');
  const result = await service.createCheckoutSession(req.auth.orgId, planId);
  res.json(result);
}

export async function stripeWebhook(req, res) {
  const signature = req.headers['stripe-signature'];
  const result = await service.handleStripeWebhook(req.body, signature);
  res.json(result);
}

export default { listPlans, getMySubscription, checkout, stripeWebhook };
