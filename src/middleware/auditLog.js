import AuditLog from '../models/AuditLog.js';

export function auditLog(options = {}) {
  return async (req, res, next) => {
    const originalJson = res.json;
    let reqBody = { ...req.body };
    let entityType = options.entityType || 'UNKNOWN';
    let entityId = options.entityId || req.params.id || null;

    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.method !== 'GET') {
        const action = req.method === 'DELETE' ? 'SOFT_DELETE' : req.method === 'POST' ? 'CREATE' : 'UPDATE';

        const changeLog = {};
        if (req.body && Object.keys(req.body).length > 0) {
          changeLog.before = null;
          changeLog.after = reqBody;
        }

        AuditLog.log({
          userId: req.user?.userId || null,
          action,
          entityType,
          entityId,
          changes: changeLog,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          status: 'SUCCESS',
        }).catch(err => console.error('Audit log error:', err));
      }

      return originalJson.call(this, data);
    };

    next();
  };
}

export async function logAdminAction(userId, action, entityType, entityId, changes, error = null) {
  try {
    await AuditLog.log({
      userId,
      action,
      entityType,
      entityId,
      changes,
      status: error ? 'FAILED' : 'SUCCESS',
      error: error?.message || null,
    });
  } catch (err) {
    console.error('Failed to log admin action:', err);
  }
}
