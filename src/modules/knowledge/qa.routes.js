import { Router } from 'express';
import * as controller from './qa.controller.js';
import { createQaSchema, updateQaSchema } from './qa.schema.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

// requireAuth уже применён в родительском agents.routes.js
const router = Router({ mergeParams: true });

router.get('/', asyncHandler(controller.listQaPairs));
router.post('/', validate(createQaSchema), asyncHandler(controller.createQaPair));
router.patch('/:qaId', validate(updateQaSchema), asyncHandler(controller.updateQaPair));
router.delete('/:qaId', asyncHandler(controller.deleteQaPair));

export default router;
