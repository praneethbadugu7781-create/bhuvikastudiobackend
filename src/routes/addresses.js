import { Router } from 'express';
import { authenticate, requireAuth } from '../middleware/auth.js';
import * as ctrl from '../controllers/addressController.js';

const router = Router();

// All routes require authentication
router.use(authenticate, requireAuth);

router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.put('/:id/default', ctrl.setDefault);

export default router;
