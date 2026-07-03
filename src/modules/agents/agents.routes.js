import { Router } from 'express';
import * as controller from './agents.controller.js';
import { createAgentSchema, updateAgentSchema, brandingSchema, addDomainSchema, settingsSchema } from './agents.schema.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import knowledgeRouter from '../knowledge/knowledge.routes.js';
import qaRouter from '../knowledge/qa.routes.js';
import catalogRouter from '../knowledge/catalog.routes.js';
import conversationsRouter from '../chat/conversations.routes.js';
import leadsRouter from '../leads/leads.routes.js';
import analyticsRouter from '../analytics/analytics.routes.js';
import actionsRouter from '../actions/actions.routes.js';
import flowsRouter from '../flows/flows.routes.js';

const router = Router();
router.use(requireAuth);

router.get('/templates', asyncHandler(controller.listTemplates));

router.post('/', validate(createAgentSchema), asyncHandler(controller.createAgent));
router.get('/', asyncHandler(controller.listAgents));
router.get('/:agentId', asyncHandler(controller.getAgent));
router.patch('/:agentId', validate(updateAgentSchema), asyncHandler(controller.updateAgent));
router.delete('/:agentId', asyncHandler(controller.deleteAgent));

router.post('/:agentId/publish', asyncHandler(controller.publishAgent));
router.post('/:agentId/unpublish', asyncHandler(controller.unpublishAgent));

router.patch('/:agentId/branding', validate(brandingSchema), asyncHandler(controller.updateBranding));

router.get('/:agentId/domains', asyncHandler(controller.listDomains));
router.post('/:agentId/domains', validate(addDomainSchema), asyncHandler(controller.addDomain));
router.delete('/:agentId/domains/:domainId', asyncHandler(controller.removeDomain));

router.get('/:agentId/settings', asyncHandler(controller.getSettings));
router.patch('/:agentId/settings', validate(settingsSchema), asyncHandler(controller.updateSettings));

// Вложенные ресурсы агента (дашборд-часть)
router.use('/:agentId/knowledge/qa', qaRouter);
router.use('/:agentId/knowledge/products', catalogRouter);
router.use('/:agentId/knowledge', knowledgeRouter);
router.use('/:agentId/conversations', conversationsRouter);
router.use('/:agentId/leads', leadsRouter);
router.use('/:agentId/analytics', analyticsRouter);
router.use('/:agentId/actions', actionsRouter);
router.use('/:agentId/flows', flowsRouter);

export default router;
