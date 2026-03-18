import { Router } from 'express';
import { authenticate, requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import * as ctrl from '../controllers/reviewController.js';

const router = Router();

// Public
router.get('/product/:productId', ctrl.getByProduct);

// Customer
router.post('/', authenticate, requireAuth, ctrl.create);

// Admin
router.get('/', authenticate, requireAuth, requireAdmin, ctrl.getAll);
router.get('/stats', authenticate, requireAuth, requireAdmin, ctrl.getStats);
router.put('/:id/status', authenticate, requireAuth, requireAdmin, ctrl.updateStatus);
router.put('/:id/reply', authenticate, requireAuth, requireAdmin, ctrl.addReply);
router.delete('/:id', authenticate, requireAuth, requireAdmin, ctrl.remove);

export default router;
