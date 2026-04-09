import { verifySignature, getCashfreeOrderStatus } from '../utils/cashfree.js';
import Order from '../models/Order.js';

// POST /api/payments/verify
export async function verifyPayment(req, res, next) {
  try {
    const { orderId, paymentSessionId } = req.body;

    if (!orderId || !paymentSessionId) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    // Find order by Cashfree order ID
    const order = await Order.findOne({ cashfreeOrderId: orderId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Prevent double verification
    if (order.paymentStatus === 'VERIFIED') {
      return res.json({ success: true, order, message: 'Already verified' });
    }

    try {
      // Fetch payment status from Cashfree
      const paymentStatus = await getCashfreeOrderStatus(orderId);

      if (paymentStatus.order_status === 'PAID') {
        // Update order
        order.paymentStatus = 'VERIFIED';
        order.status = 'CONFIRMED';
        order.paymentRef = paymentStatus.cf_payment_id;
        await order.save();

        return res.json({ success: true, order });
      } else {
        return res.status(400).json({ error: 'Payment not completed' });
      }
    } catch (err) {
      console.error('Cashfree verification error:', err.message);
      return res.status(400).json({ error: 'Payment verification failed' });
    }
  } catch (err) {
    next(err);
  }
}
