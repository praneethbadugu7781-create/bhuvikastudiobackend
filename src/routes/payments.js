import { Router } from 'express';
import { authenticate, requireAuth } from '../middleware/auth.js';
import { paymentLimiter } from '../config/rateLimit.js';
import * as ctrl from '../controllers/paymentController.js';

const router = Router();

router.post('/verify', paymentLimiter, authenticate, requireAuth, ctrl.verifyPayment);
router.post('/verify-cashfree', paymentLimiter, authenticate, requireAuth, ctrl.verifyCashfreePayment);

export default router;
