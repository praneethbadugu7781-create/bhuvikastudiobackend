import jwt from 'jsonwebtoken';

const REAUTH_TOKEN_EXPIRY = 5 * 60 * 1000;

export function requireReauth(req, res, next) {
  const reauthToken = req.cookies.reauthToken;

  if (!reauthToken) {
    return res.status(403).json({ error: 'Re-authentication required for this action. Please verify your password.' });
  }

  try {
    const decoded = jwt.verify(reauthToken, process.env.JWT_ACCESS_SECRET);
    if (decoded.type !== 'reauth') {
      return res.status(403).json({ error: 'Invalid re-authentication token' });
    }
    req.reauthUserId = decoded.userId;
    next();
  } catch {
    return res.status(403).json({ error: 'Re-authentication expired. Please verify your password again.' });
  }
}

export function generateReauthToken(userId) {
  return jwt.sign(
    { userId, type: 'reauth' },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '5m' }
  );
}

export function setReauthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('reauthToken', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: REAUTH_TOKEN_EXPIRY,
    path: '/',
  });
}

export function clearReauthCookie(res) {
  res.clearCookie('reauthToken', { path: '/' });
}
