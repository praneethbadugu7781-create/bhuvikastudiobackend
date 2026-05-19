import mongoose from 'mongoose';

const reelSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  videoUrl: { type: String, required: true },
  coverImageUrl: { type: String, default: '' },
  productLink: { type: String, default: '' },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

reelSchema.index({ isActive: 1, displayOrder: 1 });

export default mongoose.model('Reel', reelSchema);
