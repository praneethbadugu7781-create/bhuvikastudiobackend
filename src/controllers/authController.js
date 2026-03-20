import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import RefreshToken from '../models/RefreshToken.js';
import { generateTokens, clearTokenCookies } from '../utils/generateTokens.js';
import { sendOtpEmail } from '../utils/sendEmail.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/send-otp
export async function sendOtp(req, res, next) {
  try {
    const { email } = req.body;

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Remove any existing OTPs for this email
    await Otp.deleteMany({ email });

    // Save new OTP
    await Otp.create({ email, code, expiresAt });

    // Send email via Resend
    await sendOtpEmail(email, code);

    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/verify-otp
export async function verifyOtp(req, res, next) {
  try {
    const { email, otp, name } = req.body;

    const otpRecord = await Otp.findOne({ email, code: otp });
    if (!otpRecord) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(401).json({ error: 'OTP expired' });
    }

    // Delete used OTP
    await Otp.deleteOne({ _id: otpRecord._id });

    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        name: name || null,
        role: 'CUSTOMER',
      });
    }

    // Single session: delete all existing refresh tokens for this user
    await RefreshToken.deleteMany({ userId: user._id });

    // Generate JWT tokens and set cookies
    await generateTokens(res, user);

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/admin-login
export async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, role: 'ADMIN' });
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await generateTokens(res, user);

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
export async function getMe(req, res, next) {
  try {
    if (!req.user) {
      return res.json(null);
    }

    const user = await User.findById(req.user.userId).select('name email mobile role');
    if (!user) {
      return res.json(null);
    }

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout
export async function logout(req, res, next) {
  try {
    // Delete refresh token from DB if present
    const refreshCookie = req.cookies.refreshToken;
    if (refreshCookie) {
      try {
        const decoded = jwt.verify(refreshCookie, process.env.JWT_REFRESH_SECRET);
        await RefreshToken.deleteOne({ token: decoded.token });
      } catch {
        // Token invalid, ignore
      }
    }

    clearTokenCookies(res);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/refresh
export async function refresh(req, res, next) {
  try {
    const refreshCookie = req.cookies.refreshToken;
    if (!refreshCookie) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshCookie, process.env.JWT_REFRESH_SECRET);
    } catch {
      clearTokenCookies(res);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Find the refresh token in DB
    const storedToken = await RefreshToken.findOne({ token: decoded.token, userId: decoded.userId });
    if (!storedToken) {
      clearTokenCookies(res);
      return res.status(401).json({ error: 'Refresh token revoked' });
    }

    // Delete old token (rotation)
    await RefreshToken.deleteOne({ _id: storedToken._id });

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      clearTokenCookies(res);
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new token pair
    await generateTokens(res, user);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/check-email - Check if email exists
export async function checkEmail(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    res.json({ exists: !!user, name: user?.name || null });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/google - Google Sign-In
export async function googleAuth(req, res, next) {
  try {
    const { credential } = req.body;

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        name: name || null,
        avatar: picture || null,
        role: 'CUSTOMER',
        googleId: payload.sub,
      });
    } else if (!user.googleId) {
      // Link Google account to existing user
      user.googleId = payload.sub;
      if (!user.name && name) user.name = name;
      if (!user.avatar && picture) user.avatar = picture;
      await user.save();
    }

    // Single session: delete all existing refresh tokens
    await RefreshToken.deleteMany({ userId: user._id });

    // Generate JWT tokens
    await generateTokens(res, user);

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
}
