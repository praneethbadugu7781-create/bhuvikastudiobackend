import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  productId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  rating:           { type: Number, required: true, min: 1, max: 5 },
  title:            { type: String, default: '' },
  comment:          { type: String, default: '' },
  images:           [{ type: String }],
  status:           { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  isVerifiedPurchase: { type: Boolean, default: false },
  helpfulCount:     { type: Number, default: 0 },
  adminReply:       { type: String, default: null },
  adminReplyAt:     { type: Date, default: null },
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  deletedAt:        { type: Date, default: null },
}, { timestamps: true });

reviewSchema.index({ productId: 1, status: 1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ updatedAt: -1, updatedBy: 1 });

reviewSchema.pre(/^find/, function() {
  if (this.options._recursed) return;
  this.where({ deletedAt: null });
});

reviewSchema.query.withDeleted = function() {
  return this.where({});
};

reviewSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

export default mongoose.model('Review', reviewSchema);
