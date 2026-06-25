import { Router } from 'express';
import { authenticate, requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import * as ctrl from '../controllers/sizeChartController.js';

const router = Router();

router.get('/', ctrl.getAll);
router.get('/:category', ctrl.getByCategory);

router.put('/:category', authenticate, requireAuth, requireAdmin, ctrl.upsert);
router.delete('/:category', authenticate, requireAuth, requireAdmin, ctrl.remove);

export default router;
