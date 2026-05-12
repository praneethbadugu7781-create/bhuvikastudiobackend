import rateLimit from 'express-rate-limit';

// General API: 100 requests per 15 minutes per IP
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // Increased for proxied requests
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// Auth (OTP): 5 requests per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Increased from 5 to allow for accidental retries
  message: { error: 'Too many OTP requests. Please wait 15 minutes.' },
});

// Payment verification: 10 per 15 minutes
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Increased
  message: { error: 'Too many payment verification attempts' },
});
