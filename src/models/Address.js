import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fullName:   { type: String, required: true },
  phone:      { type: String, required: true },
  line1:      { type: String, required: true },
  line2:      { type: String, default: '' },
  city:       { type: String, required: true },
  state:      { type: String, default: 'Andhra Pradesh' },
  postalCode: { type: String, required: true },
  isDefault:  { type: Boolean, default: false },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  deletedAt:  { type: Date, default: null },
}, {
  timestamps: true,
});

addressSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

addressSchema.pre(/^find/, function() {
  if (this.options._recursed) return;
  this.where({ deletedAt: null });
});

addressSchema.query.withDeleted = function() {
  return this.where({});
};

addressSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

export default mongoose.model('Address', addressSchema);
