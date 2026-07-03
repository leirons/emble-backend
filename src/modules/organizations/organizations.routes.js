import { Router } from 'express';
import * as controller from './organizations.controller.js';
import { inviteMemberSchema } from '../auth/auth.schema.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

const router = Router();
router.use(requireAuth);

router.get('/me', asyncHandler(controller.getMyOrganization));
router.get('/members', asyncHandler(controller.listMembers));
router.post('/members', requireRole('owner', 'admin'), validate(inviteMemberSchema), asyncHandler(controller.inviteMember));
router.delete('/members/:userId', requireRole('owner', 'admin'), asyncHandler(controller.removeMember));

export default router;
