import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../config/rateLimit.js';
import { sendOtpSchema, verifyOtpSchema, adminLoginSchema } from '../validators/authValidators.js';
import * as ctrl from '../controllers/authController.js';

const router = Router();

router.post('/send-otp', authLimiter, validate(sendOtpSchema), ctrl.sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), ctrl.verifyOtp);
router.post('/admin-login', authLimiter, validate(adminLoginSchema), ctrl.adminLogin);
router.get('/me', authenticate, ctrl.getMe);
router.post('/logout', ctrl.logout);
router.post('/refresh', ctrl.refresh);

export default router;
