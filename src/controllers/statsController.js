import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';

// GET /api/stats
export async function getStats(_req, res, next) {
  try {
    const [productCount, orderCount, userCount, revenueResult] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      User.countDocuments({ role: 'CUSTOMER' }),
      Order.aggregate([
        { $match: { 
          $or: [
            { paymentStatus: 'VERIFIED' }, 
            { status: { $in: ['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'] } }
          ] 
        } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ]);

    const revenue = revenueResult[0]?.total || 0;

    res.json({ productCount, orderCount, userCount, revenue });
  } catch (err) {
    next(err);
  }
}
