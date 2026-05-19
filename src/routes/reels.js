import { Router } from 'express';
import { authenticate, requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import * as ctrl from '../controllers/reelController.js';

const router = Router();

// Public
router.get('/', ctrl.getActive);

// Admin
router.get('/all', authenticate, requireAuth, requireAdmin, ctrl.getAll);
router.post('/', authenticate, requireAuth, requireAdmin, ctrl.create);
router.put('/:id', authenticate, requireAuth, requireAdmin, ctrl.update);
router.put('/:id/toggle', authenticate, requireAuth, requireAdmin, ctrl.toggle);
router.delete('/:id', authenticate, requireAuth, requireAdmin, ctrl.remove);

export default router;
