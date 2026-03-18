import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Settings from '../models/Settings.js';
import { getRazorpay } from '../utils/razorpay.js';
import { sendOrderStatusEmail } from '../utils/sendEmail.js';

// Default shipping settings (fallback if not configured)
const DEFAULT_SHIPPING = {
  freeThreshold: 2000,
  defaultCharge: 80,
  codEnabled: true,
  codCharge: 0,
};

// Helper to get shipping settings from database
async function getShippingSettings() {
  const settings = await Settings.findOne({ key: 'shipping' });
  return settings?.value || DEFAULT_SHIPPING;
}

// GET /api/orders (admin)
export async function getAll(_req, res, next) {
  try {
    const orders = await Order.find()
      .populate('userId', 'name email mobile')
      .sort({ createdAt: -1 });

    // Map to match frontend expected shape
    const result = orders.map(o => {
      const obj = o.toJSON();
      obj.user = obj.userId;
      delete obj.userId;
      return obj;
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/orders (customer)
export async function create(req, res, next) {
  try {
    const { address, paymentMethod, items, couponCode, couponDiscount } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Please login to place an order' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Resolve products and build order items
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findOne({ slug: item.slug });
      if (!product) {
        return res.status(400).json({ error: `Product not found: ${item.slug}` });
      }

      // Find matching variant by size (handle missing variants/size gracefully)
      let variant = null;
      if (product.variants && product.variants.length > 0 && item.size) {
        variant = product.variants.find(v =>
          v.size && item.size && v.size.toLowerCase() === item.size.toLowerCase()
        );
        // If no exact match, use first variant as fallback
        if (!variant) {
          variant = product.variants[0];
        }
      }

      const unitPrice = variant ? (variant.salePrice || variant.price) : 0;
      const totalPrice = unitPrice * (item.qty || 1);
      subtotal += totalPrice;

      orderItems.push({
        productId: product._id,
        variantId: variant?._id?.toString() || null,
        productName: product.name,
        size: item.size || (variant?.size) || 'Free Size',
        color: variant?.color || '',
        quantity: item.qty || 1,
        unitPrice,
        totalPrice,
      });
    }

    // Get shipping settings from database
    const shipping = await getShippingSettings();
    const deliveryCharge = subtotal >= shipping.freeThreshold ? 0 : shipping.defaultCharge;
    const discount = couponDiscount || 0;
    const totalAmount = subtotal + deliveryCharge - discount;

    // Create order
    const order = await Order.create({
      userId,
      address,
      paymentMethod: paymentMethod || 'COD',
      paymentStatus: 'PENDING',
      status: 'PENDING',
      subtotal,
      couponCode: couponCode || null,
      couponDiscount: discount,
      deliveryCharge,
      totalAmount,
      items: orderItems,
    });

    // Increment coupon usage if coupon was used
    if (couponCode) {
      await Coupon.updateOne(
        { code: couponCode.toUpperCase() },
        { $inc: { usedCount: 1 } }
      );
    }

    // If Razorpay, create Razorpay order
    if (paymentMethod === 'RAZORPAY') {
      try {
        const razorpay = getRazorpay();
        const rpOrder = await razorpay.orders.create({
          amount: Math.round(totalAmount * 100),
          currency: 'INR',
          receipt: order._id.toString(),
        });

        order.razorpayOrderId = rpOrder.id;
        await order.save();
      } catch (rpErr) {
        console.error('Razorpay order creation failed:', rpErr.message);
      }
    }

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

// PUT /api/orders/:id (admin)
export async function update(req, res, next) {
  try {
    const { status, paymentStatus, adminNote } = req.body;

    // Get the current order to check if status is changing
    const currentOrder = await Order.findById(req.params.id).populate('userId', 'name email mobile');
    if (!currentOrder) return res.status(404).json({ error: 'Order not found' });

    const oldStatus = currentOrder.status;
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (adminNote !== undefined) updateData.adminNote = adminNote;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('userId', 'name email mobile');

    // Send email notification if status changed
    if (status && status !== oldStatus) {
      const customerEmail = order.userId?.email || order.address?.email;
      if (customerEmail) {
        sendOrderStatusEmail(customerEmail, order, status).catch(err => {
          console.error('Failed to send order status email:', err.message);
        });
      }
    }

    const obj = order.toJSON();
    obj.user = obj.userId;
    delete obj.userId;

    res.json(obj);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/orders/:id (admin)
export async function remove(req, res, next) {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
