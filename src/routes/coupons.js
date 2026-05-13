import { Router } from 'express';
import { authenticate, requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import * as ctrl from '../controllers/couponController.js';

const router = Router();

// Customer
router.get('/active', ctrl.getPublic);
router.post('/validate', ctrl.validate);

// Admin
router.get('/', authenticate, requireAuth, requireAdmin, ctrl.getAll);
router.post('/', authenticate, requireAuth, requireAdmin, ctrl.create);
router.put('/:id', authenticate, requireAuth, requireAdmin, ctrl.update);
router.delete('/:id', authenticate, requireAuth, requireAdmin, ctrl.remove);

export default router;
