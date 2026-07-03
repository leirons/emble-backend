import { Router } from 'express';
import * as controller from './flows.controller.js';
import { createFlowSchema, updateFlowSchema } from './flows.schema.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

// requireAuth уже применён в родительском agents.routes.js
const router = Router({ mergeParams: true });

router.get('/', asyncHandler(controller.listFlows));
router.post('/', validate(createFlowSchema), asyncHandler(controller.createFlow));
router.patch('/:flowId', validate(updateFlowSchema), asyncHandler(controller.updateFlow));
router.delete('/:flowId', asyncHandler(controller.deleteFlow));
router.post('/:flowId/activate', asyncHandler(controller.activateFlow));
router.post('/:flowId/deactivate', asyncHandler(controller.deactivateFlow));

export default router;
