import { Router } from 'express';
import { authenticate, requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import * as ctrl from '../controllers/customerController.js';

const router = Router();

router.get('/', authenticate, requireAuth, requireAdmin, ctrl.getAll);

export default router;
