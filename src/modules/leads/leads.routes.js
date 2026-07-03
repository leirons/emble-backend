import { Router } from 'express';
import * as controller from './leads.controller.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

// requireAuth уже применён в родительском agents.routes.js (дашборд)
const router = Router({ mergeParams: true });

router.get('/', asyncHandler(controller.listLeads));
router.get('/export.csv', asyncHandler(controller.exportLeads));

export default router;
