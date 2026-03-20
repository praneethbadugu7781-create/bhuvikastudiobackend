import mongoose from 'mongoose';

const addressSnapshotSchema = new mongoose.Schema({
  fullName:   { type: String, required: true },
  phone:      { type: String, required: true },
  email:      { type: String, default: null },
  line1:      { type: String, required: true },
  line2:      { type: String, default: null },
  city:       { type: String, required: true },
  state:      { type: String, default: 'Andhra Pradesh' },
  postalCode: { type: String, required: true },
  country:    { type: String, default: 'India' },
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId:   { type: String, default: null },
  productName: { type: String, required: true },
  size:        { type: String, default: '' },
  color:       { type: String, default: '' },
  quantity:    { type: Number, required: true, min: 1 },
  unitPrice:   { type: Number, required: true },
  totalPrice:  { type: Number, required: true },
});

const orderSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  address:         { type: addressSnapshotSchema, required: true },
  paymentMethod:   { type: String, enum: ['UPI', 'COD', 'RAZORPAY'], default: 'COD' },
  paymentStatus:   { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
  status:          { type: String, enum: ['PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'], default: 'PENDING' },
  subtotal:        { type: Number, required: true },
  couponCode:      { type: String, default: null },
  couponDiscount:  { type: Number, default: 0 },
  deliveryCharge:  { type: Number, required: true },
  totalAmount:     { type: Number, required: true },
  paymentRef:      { type: String, default: null },
  razorpayOrderId: { type: String, default: null },
  adminNote:       { type: String, default: null },
  items:           [orderItemSchema],
  // Shipping details
  trackingNumber:  { type: String, default: null },
  courierCompany:  { type: String, default: null },
  trackingUrl:     { type: String, default: null },
  shippedAt:       { type: Date, default: null },
  deliveredAt:     { type: Date, default: null },
}, {
  timestamps: true,
});

orderSchema.index({ status: 1, paymentStatus: 1 });

export default mongoose.model('Order', orderSchema);
