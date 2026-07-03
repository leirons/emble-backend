import { Router } from 'express';
import * as controller from './conversations.controller.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

// requireAuth уже применён в родительском agents.routes.js (дашборд)
const router = Router({ mergeParams: true });

router.get('/', asyncHandler(controller.listConversations));
router.get('/:conversationId/messages', asyncHandler(controller.getMessages));

export default router;
