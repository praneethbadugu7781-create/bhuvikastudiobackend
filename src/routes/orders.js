import { Router } from 'express';
import { authenticate, requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import { createOrderSchema, updateOrderSchema, returnRequestSchema, returnCourierSchema, adminReturnActionSchema } from '../validators/orderValidators.js';
import * as ctrl from '../controllers/orderController.js';

const router = Router();

// Public: track order (no auth needed)
router.get('/track/:id', ctrl.trackOrder);
router.post('/track/:id/confirm', ctrl.confirmDelivery);

// Customer: get my orders
router.get('/my-orders', authenticate, requireAuth, ctrl.getMyOrders);

// Customer: request return
router.post('/:id/return', authenticate, requireAuth, validate(returnRequestSchema), ctrl.requestReturn);
// Customer: update return courier info
router.put('/:id/return-courier', authenticate, requireAuth, validate(returnCourierSchema), ctrl.updateReturnCourier);
// Admin: approve/reject/receive/refund
router.put('/:id/return-action', authenticate, requireAuth, requireAdmin, validate(adminReturnActionSchema), ctrl.adminReturnAction);

// Admin: all orders
router.get('/', authenticate, requireAuth, requireAdmin, ctrl.getAll);

// Customer: place order
router.post('/', authenticate, requireAuth, validate(createOrderSchema), ctrl.create);

// Admin: update/delete
router.put('/:id', authenticate, requireAuth, requireAdmin, validate(updateOrderSchema), ctrl.update);
router.delete('/:id', authenticate, requireAuth, requireAdmin, ctrl.remove);

export default router;
