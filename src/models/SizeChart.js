import mongoose from 'mongoose';

const measurementSchema = new mongoose.Schema({
  size: { type: String, required: true },
  chest: { type: String, default: '' },
  waist: { type: String, default: '' },
  hip: { type: String, default: '' },
  length: { type: String, default: '' },
  ageRange: { type: String, default: '' },
}, { _id: false });

const sizeChartSchema = new mongoose.Schema({
  category: { type: String, required: true, unique: true, index: true },
  type: { type: String, enum: ['standard', 'kids'], default: 'standard' },
  measurements: [measurementSchema],
}, { timestamps: true });

export default mongoose.model('SizeChart', sizeChartSchema);
