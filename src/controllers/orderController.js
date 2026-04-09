import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Settings from '../models/Settings.js';
import { createCashfreeOrder } from '../utils/cashfree.js';
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
    // Log full request body for debugging
    console.log('Order creation - Full request body:', JSON.stringify(req.body, null, 2));

    const { address, paymentMethod, items, couponCode, couponDiscount } = req.body;
    const userId = req.user?.userId;

    // Log coupon data for debugging
    console.log('Order creation - Coupon data received:', { couponCode, couponDiscount });

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

    // If Cashfree, create Cashfree order
    if (paymentMethod === 'CASHFREE') {
      try {
        const cfOrder = await createCashfreeOrder({
          order_id: order._id.toString(),
          order_amount: Math.round(totalAmount * 100) / 100,
          order_currency: 'INR',
          customer_details: {
            customer_id: userId.toString(),
            customer_name: address.fullName,
            customer_email: address.email || 'noemail@example.com',
            customer_phone: address.phone,
          },
          order_meta: {
            return_url: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/checkout?order_id=${order._id}`,
            notify_url: `${process.env.API_URL || 'http://localhost:5000'}/api/payments/webhook`,
          },
          order_note: `Order from Bhuvika Studio - ${order._id}`,
        });

        order.cashfreeOrderId = cfOrder.order_id;
        await order.save();
      } catch (cfErr) {
        console.error('Cashfree order creation failed:', cfErr.message);
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
    const { status, paymentStatus, adminNote, trackingNumber, courierCompany, trackingUrl } = req.body;

    // Get the current order to check if status is changing
    const currentOrder = await Order.findById(req.params.id).populate('userId', 'name email mobile');
    if (!currentOrder) return res.status(404).json({ error: 'Order not found' });

    const oldStatus = currentOrder.status;
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (adminNote !== undefined) updateData.adminNote = adminNote;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (courierCompany !== undefined) updateData.courierCompany = courierCompany;
    if (trackingUrl !== undefined) updateData.trackingUrl = trackingUrl;

    // Set timestamps for shipping/delivery
    if (status === 'SHIPPED' && oldStatus !== 'SHIPPED') {
      updateData.shippedAt = new Date();
    }
    if (status === 'DELIVERED' && oldStatus !== 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }

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

// GET /api/orders/track/:id (public - for customer tracking)
export async function trackOrder(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Return limited info for public tracking
    res.json({
      orderId: order._id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      items: order.items.map(item => ({
        productName: item.productName,
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      subtotal: order.subtotal,
      deliveryCharge: order.deliveryCharge,
      couponDiscount: order.couponDiscount,
      totalAmount: order.totalAmount,
      trackingNumber: order.trackingNumber,
      courierCompany: order.courierCompany,
      trackingUrl: order.trackingUrl,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      createdAt: order.createdAt,
      address: {
        city: order.address?.city,
        state: order.address?.state,
        postalCode: order.address?.postalCode,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/my-orders (customer - get their own orders)
export async function getMyOrders(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Please login to view orders' });
    }

    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(orders.map(o => ({
      _id: o._id,
      status: o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      items: o.items.map(item => ({ productName: item.productName })),
    })));
  } catch (err) {
    next(err);
  }
}
