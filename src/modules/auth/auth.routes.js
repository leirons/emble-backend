import { Router } from 'express';
import * as controller from './auth.controller.js';
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from './auth.schema.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { authRateLimit } from '../../middleware/rateLimit.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

const router = Router();

router.post('/register', authRateLimit, validate(registerSchema), asyncHandler(controller.register));
router.post('/login', authRateLimit, validate(loginSchema), asyncHandler(controller.login));
router.post('/refresh', authRateLimit, validate(refreshSchema), asyncHandler(controller.refresh));
router.post('/logout', validate(logoutSchema), asyncHandler(controller.logout));
router.get('/me', requireAuth, asyncHandler(controller.me));

export default router;
