import { Router } from 'express';
import { authenticate, requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import * as ctrl from '../controllers/settingsController.js';

const router = Router();

// Public
router.get('/shipping', ctrl.getShipping);

// Admin only
router.put('/shipping', authenticate, requireAuth, requireAdmin, ctrl.updateShipping);
router.get('/all', authenticate, requireAuth, requireAdmin, ctrl.getAll);

export default router;
