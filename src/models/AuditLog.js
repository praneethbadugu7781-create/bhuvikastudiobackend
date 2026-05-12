import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action:       { type: String, enum: ['CREATE', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'RESTORE', 'EXPORT', 'LOGIN'], required: true },
  entityType:   { type: String, required: true },
  entityId:     { type: mongoose.Schema.Types.ObjectId, default: null },
  changes:      { type: Object, default: {} },
  ipAddress:    { type: String, default: null },
  userAgent:    { type: String, default: null },
  status:       { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS' },
  error:        { type: String, default: null },
}, {
  timestamps: true,
});

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

auditLogSchema.statics.log = async function(payload) {
  try {
    const log = new this(payload);
    return await log.save();
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
};

export default mongoose.model('AuditLog', auditLogSchema);
