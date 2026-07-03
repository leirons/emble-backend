import { Router } from 'express';
import * as controller from './billing.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

const router = Router();

router.get('/plans', asyncHandler(controller.listPlans));
router.get('/subscription', requireAuth, asyncHandler(controller.getMySubscription));
router.post('/checkout', requireAuth, requireRole('owner', 'admin'), asyncHandler(controller.checkout));

export default router;
