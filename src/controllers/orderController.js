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
      paymentStatus: (paymentMethod === 'COD' || !paymentMethod) ? 'VERIFIED' : 'PENDING',
      status: (paymentMethod === 'COD' || !paymentMethod) ? 'CONFIRMED' : 'PENDING',
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

    // Send email for COD orders (since they are auto-confirmed)
    if (paymentMethod === 'COD' || !paymentMethod) {
      const customerEmail = address.email || (await order.populate('userId')).userId?.email;
      if (customerEmail) {
        sendOrderStatusEmail(customerEmail, order, 'CONFIRMED').catch(() => {});
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
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Fetch product details for images dynamically
    const itemsWithImages = await Promise.all(order.items.map(async item => {
      const product = await Product.findById(item.productId).select('images');
      return {
        productName: item.productName,
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        image: product?.images?.[0]?.imageUrl || null,
      };
    }));

    res.json({
      orderId: order._id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      items: itemsWithImages,
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
      returnStatus: order.returnStatus,
      returnReason: order.returnReason,
      returnRequestedAt: order.returnRequestedAt,
      returnCourierCompany: order.returnCourierCompany,
      returnTrackingNumber: order.returnTrackingNumber,
      returnApprovedAt: order.returnApprovedAt,
      returnReceivedAt: order.returnReceivedAt,
      refundAmount: order.refundAmount,
      refundNote: order.refundNote,
      refundedAt: order.refundedAt,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/track/:id/confirm (public)
export async function confirmDelivery(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'SHIPPED') return res.status(400).json({ error: 'Only shipped orders can be confirmed' });

    order.status = 'DELIVERED';
    order.deliveredAt = new Date();
    await order.save();

    const customerEmail = order.userId?.email || order.address?.email;
    if (customerEmail) {
      sendOrderStatusEmail(customerEmail, order, 'DELIVERED').catch(() => {});
    }

    res.json({ success: true, status: 'DELIVERED' });
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

    const results = await Promise.all(orders.map(async o => {
      const itemsWithImages = await Promise.all(o.items.map(async item => {
        const product = await Product.findById(item.productId).select('images');
        return {
          productName: item.productName,
          size: item.size,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          image: product?.images?.[0]?.imageUrl || null,
        };
      }));

      return {
        _id: o._id,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        totalAmount: o.totalAmount,
        createdAt: o.createdAt,
        deliveredAt: o.deliveredAt,
        items: itemsWithImages,
        returnStatus: o.returnStatus,
        returnReason: o.returnReason,
        returnRequestedAt: o.returnRequestedAt,
        returnCourierCompany: o.returnCourierCompany,
        returnTrackingNumber: o.returnTrackingNumber,
        returnApprovedAt: o.returnApprovedAt,
        returnReceivedAt: o.returnReceivedAt,
        refundAmount: o.refundAmount,
        refundNote: o.refundNote,
        refundedAt: o.refundedAt,
      };
    }));

    res.json(results);
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/:id/return (customer)
export async function requestReturn(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Please login to request a return' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorised' });
    }

    if (order.status !== 'DELIVERED') {
      return res.status(400).json({ error: 'Only delivered orders can be returned' });
    }

    if (!order.deliveredAt || (Date.now() - new Date(order.deliveredAt).getTime()) > 7 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Return window (7 days) has expired' });
    }

    if (order.returnStatus !== 'NONE') {
      return res.status(400).json({ error: 'Return already requested or processed' });
    }

    order.returnStatus = 'REQUESTED';
    order.returnReason = req.body.returnReason;
    order.returnRequestedAt = new Date();
    await order.save();

    res.json(order);
  } catch (err) {
    next(err);
  }
}

// PUT /api/orders/:id/return-courier (customer)
export async function updateReturnCourier(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Please login' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorised' });
    }

    if (order.returnStatus !== 'APPROVED') {
      return res.status(400).json({ error: 'Return must be approved before adding courier info' });
    }

    order.returnCourierCompany = req.body.returnCourierCompany;
    order.returnTrackingNumber = req.body.returnTrackingNumber;
    await order.save();

    res.json(order);
  } catch (err) {
    next(err);
  }
}

// PUT /api/orders/:id/return-action (admin)
export async function adminReturnAction(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const { action } = req.body;

    switch (action) {
      case 'APPROVE':
        if (order.returnStatus !== 'REQUESTED') {
          return res.status(400).json({ error: 'Only requested returns can be approved' });
        }
        order.returnStatus = 'APPROVED';
        order.returnApprovedAt = new Date();
        break;

      case 'REJECT':
        if (order.returnStatus !== 'REQUESTED') {
          return res.status(400).json({ error: 'Only requested returns can be rejected' });
        }
        order.returnStatus = 'REJECTED';
        order.returnRejectedAt = new Date();
        if (req.body.adminNote) order.adminNote = req.body.adminNote;
        break;

      case 'MARK_RECEIVED':
        if (order.returnStatus !== 'APPROVED') {
          return res.status(400).json({ error: 'Only approved returns can be marked received' });
        }
        order.returnStatus = 'RECEIVED';
        order.returnReceivedAt = new Date();
        break;

      case 'REFUND':
        if (order.returnStatus !== 'RECEIVED') {
          return res.status(400).json({ error: 'Only received returns can be refunded' });
        }
        order.returnStatus = 'REFUNDED';
        order.refundAmount = req.body.refundAmount || order.totalAmount;
        order.refundNote = req.body.refundNote || null;
        order.refundedAt = new Date();
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    await order.save();
    await order.populate('userId', 'name email mobile');

    const obj = order.toJSON();
    obj.user = obj.userId;
    delete obj.userId;

    res.json(obj);
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/:id/cancel (customer)
export async function cancelOrder(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Please login' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorised' });
    }

    // Only pending orders can be cancelled
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending orders can be cancelled' });
    }

    order.status = 'CANCELLED';
    await order.save();

    // Send email notification for cancellation
    const customerEmail = order.address?.email || (await order.populate('userId')).userId?.email;
    if (customerEmail) {
      sendOrderStatusEmail(customerEmail, order, 'CANCELLED').catch(() => {});
    }

    res.json({ success: true, status: 'CANCELLED' });
  } catch (err) {
    next(err);
  }
}

