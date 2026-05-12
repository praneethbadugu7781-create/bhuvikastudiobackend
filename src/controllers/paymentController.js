import crypto from 'crypto';
import Order from '../models/Order.js';
import { sendOrderStatusEmail } from '../utils/sendEmail.js';
import { getCashfreeOrderStatus } from '../utils/cashfree.js';

// POST /api/payments/verify
export async function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!orderId || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.paymentStatus === 'VERIFIED') {
      return res.json({ success: true, order, message: 'Already verified' });
    }

    try {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto.createHmac("sha256", keySecret).update(body).digest("hex");

      if (expectedSignature === razorpay_signature) {
        order.paymentStatus = 'VERIFIED';
        order.status = 'CONFIRMED';
        order.paymentRef = razorpay_payment_id;
        order.razorpayOrderId = razorpay_order_id;
        await order.save();

        const customerEmail = order.address?.email || (await order.populate('userId')).userId?.email;
        if (customerEmail) {
          sendOrderStatusEmail(customerEmail, order, 'CONFIRMED').catch(() => {});
        }
        return res.json({ success: true, order });
      } else {
        return res.status(400).json({ error: 'Payment signature mismatch' });
      }
    } catch (err) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/verify-cashfree
export async function verifyCashfreePayment(req, res, next) {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.paymentStatus === 'VERIFIED') {
      return res.json({ success: true, order });
    }

    try {
      const cfOrder = await getCashfreeOrderStatus(order.cashfreeOrderId || order._id.toString());
      
      if (cfOrder.order_status === 'PAID') {
        order.paymentStatus = 'VERIFIED';
        order.status = 'CONFIRMED';
        await order.save();

        const customerEmail = order.address?.email || (await order.populate('userId')).userId?.email;
        if (customerEmail) {
          sendOrderStatusEmail(customerEmail, order, 'CONFIRMED').catch(() => {});
        }
        return res.json({ success: true, order });
      } else {
        return res.status(400).json({ error: `Payment status: ${cfOrder.order_status}` });
      }
    } catch (err) {
      return res.status(400).json({ error: 'Failed to verify Cashfree payment' });
    }
  } catch (err) {
    next(err);
  }
}
