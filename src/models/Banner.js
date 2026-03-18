import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  mobileImageUrl: { type: String, default: null },
  linkUrl: { type: String, default: '/shop' },
  linkText: { type: String, default: 'Shop Now' },
  position: { type: String, enum: ['HERO', 'PROMO', 'CATEGORY', 'FOOTER'], default: 'HERO' },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  backgroundColor: { type: String, default: '#fce4ec' },
  textColor: { type: String, default: '#1a1a1a' },
}, { timestamps: true });

bannerSchema.index({ position: 1, isActive: 1, displayOrder: 1 });

export default mongoose.model('Banner', bannerSchema);
