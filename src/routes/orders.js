import { Router } from 'express';
import { authenticate, requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import { createOrderSchema, updateOrderSchema } from '../validators/orderValidators.js';
import * as ctrl from '../controllers/orderController.js';

const router = Router();

// Public: track order (no auth needed)
router.get('/track/:id', ctrl.trackOrder);

// Admin: all orders
router.get('/', authenticate, requireAuth, requireAdmin, ctrl.getAll);

// Customer: place order
router.post('/', authenticate, requireAuth, validate(createOrderSchema), ctrl.create);

// Admin: update/delete
router.put('/:id', authenticate, requireAuth, requireAdmin, validate(updateOrderSchema), ctrl.update);
router.delete('/:id', authenticate, requireAuth, requireAdmin, ctrl.remove);

export default router;
