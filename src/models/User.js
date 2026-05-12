import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name:        { type: String, default: null },
  email:       { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  mobile:      { type: String, unique: true, sparse: true },
  role:        { type: String, enum: ['CUSTOMER', 'ADMIN'], default: 'CUSTOMER' },
  password:    { type: String, default: null },
  googleId:    { type: String, default: null },
  avatar:      { type: String, default: null },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  deletedAt:   { type: Date, default: null },
  isAnonymized: { type: Boolean, default: false },
}, {
  timestamps: true,
});

// Exclude soft-deleted records by default
userSchema.pre(/^find/, function() {
  if (this.options._recursed) return;
  this.where({ deletedAt: null });
});

// Method to include deleted records
userSchema.query.withDeleted = function() {
  return this.where({});
};

// Method to soft delete
userSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Method to permanently delete (admin only)
userSchema.methods.hardDelete = async function() {
  return this.deleteOne();
};

// Anonymize user data (GDPR compliance)
userSchema.methods.anonymize = function() {
  this.name = 'Deleted User';
  this.email = `deleted-${this._id}@deleted.local`;
  this.mobile = null;
  this.avatar = null;
  this.password = null;
  this.googleId = null;
  this.isAnonymized = true;
  this.deletedAt = new Date();
  return this.save();
};

export default mongoose.model('User', userSchema);
