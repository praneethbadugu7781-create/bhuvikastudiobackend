import { Router } from 'express';
import { authenticate, requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import * as ctrl from '../controllers/statsController.js';

const router = Router();

router.get('/', authenticate, requireAuth, requireAdmin, ctrl.getStats);

export default router;
