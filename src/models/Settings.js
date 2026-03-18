import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);

// Default settings keys:
// - shipping.freeThreshold (number) - Free shipping above this amount
// - shipping.defaultCharge (number) - Default delivery charge
// - shipping.zones (array) - [{name, charge, pincodes}]
// - shipping.codEnabled (boolean) - COD available
// - shipping.codCharge (number) - Extra COD charge
