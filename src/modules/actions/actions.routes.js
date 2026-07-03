import { Router } from 'express';
import * as controller from './actions.controller.js';
import { createActionSchema, updateActionSchema, testActionSchema } from './actions.schema.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

// requireAuth уже применён в родительском agents.routes.js
const router = Router({ mergeParams: true });

router.get('/', asyncHandler(controller.listActions));
router.post('/', validate(createActionSchema), asyncHandler(controller.createAction));
router.patch('/:actionId', validate(updateActionSchema), asyncHandler(controller.updateAction));
router.delete('/:actionId', asyncHandler(controller.deleteAction));
router.get('/:actionId/logs', asyncHandler(controller.listActionLogs));
router.post('/test', validate(testActionSchema), asyncHandler(controller.testAction));

export default router;
