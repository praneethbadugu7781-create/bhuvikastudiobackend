import jwt from 'jsonwebtoken';

// Soft auth: sets req.user or null, never returns 401
export function authenticate(req, _res, next) {
  let token = req.cookies.accessToken;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { userId: decoded.userId, role: decoded.role };
  } catch {
    req.user = null;
  }
  next();
}

// Hard auth: returns 401 if not authenticated
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Please login first' });
  }
  next();
}
