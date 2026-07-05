import { Router } from 'express';
import multer from 'multer';
import * as controller from './catalog.controller.js';
import { createProductSchema, updateProductSchema, importUrlSchema, previewFeedSchema } from './catalog.schema.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler as h } from '../../lib/asyncHandler.js';

// requireAuth уже применён в родительском agents.routes.js
const router = Router({ mergeParams: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB для CSV/JSON каталога до 10000 строк
});

router.get('/', h(controller.listProducts));
router.post('/', validate(createProductSchema), h(controller.createProduct));
router.post('/import', upload.single('file'), h(controller.importProducts));
router.post('/import-url/preview', validate(previewFeedSchema), h(controller.previewFeed));
router.post('/import-url', validate(importUrlSchema), h(controller.importProductsFromUrl));
router.get('/import-jobs/:jobId', h(controller.getImportJobStatus));
router.delete('/', h(controller.clearProducts));
router.patch('/:productId', validate(updateProductSchema), h(controller.updateProduct));
router.delete('/:productId', h(controller.deleteProduct));

export default router;
