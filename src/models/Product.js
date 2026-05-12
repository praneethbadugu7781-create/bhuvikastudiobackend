import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  sku:           { type: String, required: true },
  size:          { type: String, required: true },
  color:         { type: String, default: '' },
  price:         { type: Number, required: true },
  salePrice:     { type: Number, default: null },
  stockQuantity: { type: Number, default: 0 },
}, { timestamps: true });

const imageSchema = new mongoose.Schema({
  imageUrl:    { type: String, required: true },
  altText:     { type: String, default: null },
  displayRank: { type: Number, default: 0 },
});

const colorOptionSchema = new mongoose.Schema({
  colorName:  { type: String, required: true },
  colorCode:  { type: String, default: '#000000' }, // hex color for swatch
  images:     [imageSchema],
});

const productSchema = new mongoose.Schema({
  slug:         { type: String, unique: true, required: true, lowercase: true },
  name:         { type: String, required: true },
  description:  { type: String, default: '' },
  category:     { type: String, required: true, index: true },
  featured:     { type: Boolean, default: false },
  isNewArrival: { type: Boolean, default: false },
  isBestSeller: { type: Boolean, default: false },
  stockStatus:  { type: String, enum: ['IN_STOCK', 'OUT_OF_STOCK'], default: 'IN_STOCK' },
  variants:     [variantSchema],
  images:       [imageSchema],
  colorOptions: [colorOptionSchema],
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  deletedAt:    { type: Date, default: null },
}, {
  timestamps: true,
});

productSchema.index({ featured: 1, isNewArrival: 1, isBestSeller: 1 });
productSchema.index({ updatedAt: -1, updatedBy: 1 });

productSchema.pre(/^find/, function() {
  if (this.options._recursed) return;
  this.where({ deletedAt: null });
});

productSchema.query.withDeleted = function() {
  return this.where({});
};

productSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

export default mongoose.model('Product', productSchema);
