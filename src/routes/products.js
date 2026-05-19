import { Router } from 'express';
import { authenticate, requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import { createProductSchema, updateProductSchema } from '../validators/productValidators.js';
import * as ctrl from '../controllers/productController.js';

const router = Router();

// Public
router.get('/', ctrl.getAll);
router.post('/chat-stylist', ctrl.chatStylist);
router.get('/:id', ctrl.getOne);

// Admin protected
router.post('/', authenticate, requireAuth, requireAdmin, validate(createProductSchema), ctrl.create);
router.put('/:id', authenticate, requireAuth, requireAdmin, validate(updateProductSchema), ctrl.update);
router.delete('/:id', authenticate, requireAuth, requireAdmin, ctrl.remove);

export default router;
