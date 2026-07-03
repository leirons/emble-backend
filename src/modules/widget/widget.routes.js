import { Router } from 'express';
import * as controller from './widget.controller.js';
import { startConversationSchema, sendMessageSchema, advanceFlowSchema, feedbackSchema, trackEventSchema } from './widget.schema.js';
import { validate } from '../../middleware/validate.js';
import { resolveAgentBySlug, checkWidgetOrigin } from '../../middleware/widgetContext.js';
import { widgetRateLimit } from '../../middleware/rateLimit.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

const router = Router();

// Публичный API — без requireAuth. Защита: whitelist домена + rate limit на агента/IP.
router.use('/:agentSlug', resolveAgentBySlug, checkWidgetOrigin);

router.get('/:agentSlug/config', asyncHandler(controller.getConfig));
router.post(
  '/:agentSlug/conversations',
  widgetRateLimit,
  validate(startConversationSchema),
  asyncHandler(controller.startConversation)
);
router.post(
  '/:agentSlug/conversations/:conversationId/messages',
  widgetRateLimit,
  validate(sendMessageSchema),
  asyncHandler(controller.sendMessage)
);
router.post(
  '/:agentSlug/conversations/:conversationId/flow/advance',
  widgetRateLimit,
  validate(advanceFlowSchema),
  asyncHandler(controller.advanceFlow)
);
router.post(
  '/:agentSlug/conversations/:conversationId/messages/:messageId/feedback',
  widgetRateLimit,
  validate(feedbackSchema),
  asyncHandler(controller.submitFeedback)
);
router.post('/:agentSlug/events', widgetRateLimit, validate(trackEventSchema), asyncHandler(controller.trackEvent));
router.post('/:agentSlug/leads', widgetRateLimit, asyncHandler(controller.submitLead));

// Preflight для браузерных CORS-запросов с произвольных доменов клиентов.
router.options('/:agentSlug/*', (req, res) => {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(204).send();
});

export default router;
