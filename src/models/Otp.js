import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email:     { type: String, required: true, lowercase: true, index: true },
  code:      { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Automatic deletion after expiry
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Otp', otpSchema);
