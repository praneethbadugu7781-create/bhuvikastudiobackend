import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true, uppercase: true, trim: true },
  type: { type: String, enum: ['PERCENT', 'FLAT'], required: true },
  value: { type: Number, required: true }, // Percentage or flat amount
  minCartValue: { type: Number, default: 0 },
  maxDiscount: { type: Number, default: null }, // Max discount for percent coupons
  usageLimit: { type: Number, default: null }, // Total uses allowed
  usedCount: { type: Number, default: 0 },
  perUserLimit: { type: Number, default: 1 },
  validFrom: { type: Date, default: Date.now },
  validUntil: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  description: { type: String, default: '' },
}, { timestamps: true });

couponSchema.index({ isActive: 1, validUntil: 1 });

export default mongoose.model('Coupon', couponSchema);
