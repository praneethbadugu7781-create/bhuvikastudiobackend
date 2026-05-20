import { Router } from 'express';
import { authenticate, requireAuth } from '../middleware/auth.js';
import { requireReauth } from '../middleware/requireReauth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../config/rateLimit.js';
import { sendOtpSchema, verifyOtpSchema, adminLoginSchema, changePasswordSchema } from '../validators/authValidators.js';
import * as ctrl from '../controllers/authController.js';

const router = Router();

router.post('/send-otp', authLimiter, validate(sendOtpSchema), ctrl.sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), ctrl.verifyOtp);
router.post('/admin-login', validate(adminLoginSchema), ctrl.adminLogin);
router.post('/check-email', ctrl.checkEmail);
router.post('/google', ctrl.googleAuth);
router.get('/me', authenticate, ctrl.getMe);
router.post('/logout', ctrl.logout);
router.get('/token', authenticate, requireAuth, (req, res) => {
  const token = req.cookies.accessToken;
  res.json({ token });
});

// New routes for account security
router.post('/verify-password', authenticate, requireAuth, authLimiter, ctrl.verifyPassword);
router.post('/change-password', authenticate, requireAuth, authLimiter, validate(changePasswordSchema), ctrl.changePassword);
router.delete('/account', authenticate, requireAuth, requireReauth, ctrl.deleteAccount);
router.post('/export-data', authenticate, requireAuth, requireReauth, ctrl.exportData);

export default router;
