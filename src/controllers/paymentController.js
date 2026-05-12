import crypto from 'crypto';
import Order from '../models/Order.js';

// POST /api/payments/verify
export async function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!orderId || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    // Find order by ID
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Prevent double verification
    if (order.paymentStatus === 'VERIFIED') {
      return res.json({ success: true, order, message: 'Already verified' });
    }

    try {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(body)
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        // Update order
        order.paymentStatus = 'VERIFIED';
        order.status = 'CONFIRMED';
        order.paymentRef = razorpay_payment_id;
        if (order.schema && order.schema.path('razorpayOrderId')) {
            order.razorpayOrderId = razorpay_order_id;
        }
        await order.save();

        return res.json({ success: true, order });
      } else {
        return res.status(400).json({ error: 'Payment signature mismatch' });
      }
    } catch (err) {
      console.error('Razorpay verification error:', err.message);
      return res.status(400).json({ error: 'Payment verification failed' });
    }
  } catch (err) {
    next(err);
  }
}
