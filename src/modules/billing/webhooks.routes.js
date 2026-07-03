import { Router } from 'express';
import express from 'express';
import * as controller from './billing.controller.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

const router = Router();

// Stripe требует ДОСЫРОЙ (raw) body для проверки подписи — регистрируется до express.json()
// на уровне приложения, см. src/index.js.
router.post('/stripe', express.raw({ type: 'application/json' }), asyncHandler(controller.stripeWebhook));

export default router;
