import { Router } from 'express';
import multer from 'multer';
import * as controller from './knowledge.controller.js';
import { addUrlSourceSchema, addTextSourceSchema, updateSourceSchema } from './knowledge.schema.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

// requireAuth уже применён в родительском agents.routes.js
const router = Router({ mergeParams: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB — соответствует лимиту free-тарифа на объём базы знаний
});

router.get('/', asyncHandler(controller.listSources));
router.get('/:sourceId', asyncHandler(controller.getSource));
router.post('/file', upload.single('file'), asyncHandler(controller.addFileSource));
router.post('/url', validate(addUrlSourceSchema), asyncHandler(controller.addUrlSource));
router.post('/text', validate(addTextSourceSchema), asyncHandler(controller.addTextSource));
router.patch('/:sourceId', validate(updateSourceSchema), asyncHandler(controller.updateSource));
router.post('/:sourceId/resync', asyncHandler(controller.resyncSource));
router.delete('/:sourceId', asyncHandler(controller.deleteSource));

export default router;
