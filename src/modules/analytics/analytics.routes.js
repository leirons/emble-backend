import { Router } from 'express';
import * as controller from './analytics.controller.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

// requireAuth уже применён в родительском agents.routes.js
const router = Router({ mergeParams: true });

router.get('/', asyncHandler(controller.getSummary));
router.post('/unanswered/:questionId/resolve', asyncHandler(controller.resolveUnanswered));

export default router;
