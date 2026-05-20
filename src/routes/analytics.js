import { Router } from 'express';
import { authenticate, requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import * as ctrl from '../controllers/analyticsController.js';

const router = Router();

// All analytics routes are admin-only
router.use(authenticate, requireAuth, requireAdmin);

router.get('/dashboard', ctrl.getDashboard);
router.get('/sales', ctrl.getSalesChart);
router.get('/best-sellers', ctrl.getBestSellers);
router.get('/customers', ctrl.getCustomerStats);
router.get('/returns', ctrl.getReturnStats);

export default router;
