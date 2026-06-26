import { Router } from 'express';
import { authenticate, requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import * as ctrl from '../controllers/settingsController.js';

const router = Router();

// Public
router.get('/shipping', ctrl.getShipping);
router.get('/promo', ctrl.getPromo);

// Admin only
router.put('/shipping', authenticate, requireAuth, requireAdmin, ctrl.updateShipping);
router.put('/promo', authenticate, requireAuth, requireAdmin, ctrl.updatePromo);
router.get('/all', authenticate, requireAuth, requireAdmin, ctrl.getAll);

export default router;
