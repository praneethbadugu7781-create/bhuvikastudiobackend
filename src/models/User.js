import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name:     { type: String, default: null },
  email:    { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  mobile:   { type: String, unique: true, sparse: true },
  role:     { type: String, enum: ['CUSTOMER', 'ADMIN'], default: 'CUSTOMER' },
  password: { type: String, default: null },
  googleId: { type: String, default: null },
  avatar:   { type: String, default: null },
}, {
  timestamps: true,
});

export default mongoose.model('User', userSchema);
