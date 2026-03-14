import crypto from 'crypto';
import Order from '../models/Order.js';

// POST /api/payments/verify
export async function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    // Verify signature using HMAC-SHA256
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // Find order by Razorpay order ID
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Prevent double verification
    if (order.paymentStatus === 'VERIFIED') {
      return res.json({ success: true, order, message: 'Already verified' });
    }

    // Update order
    order.paymentStatus = 'VERIFIED';
    order.status = 'CONFIRMED';
    order.paymentRef = razorpay_payment_id;
    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}
