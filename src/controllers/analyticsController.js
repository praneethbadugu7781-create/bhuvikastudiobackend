import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

// GET /api/analytics/dashboard (admin)
export async function getDashboard(_req, res, next) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total counts
    const [totalOrders, totalProducts, totalCustomers] = await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      User.countDocuments({ role: 'CUSTOMER' }),
    ]);

    // Revenue calculations
    const revenueMatch = { 
      $or: [
        { paymentStatus: 'VERIFIED' }, 
        { status: { $in: ['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'] } }
      ] 
    };

    const [thisMonthRevenue, lastMonthRevenue, totalRevenue] = await Promise.all([
      Order.aggregate([
        { $match: { ...revenueMatch, createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.aggregate([
        { $match: { ...revenueMatch, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.aggregate([
        { $match: { ...revenueMatch } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ]);

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Recent orders
    const recentOrders = await Order.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalOrders,
      totalProducts,
      totalCustomers,
      thisMonthRevenue: thisMonthRevenue[0]?.total || 0,
      lastMonthRevenue: lastMonthRevenue[0]?.total || 0,
      totalRevenue: totalRevenue[0]?.total || 0,
      ordersByStatus: ordersByStatus.reduce((acc, cur) => { acc[cur._id] = cur.count; return acc; }, {}),
      recentOrders: recentOrders.map(o => {
        const obj = o.toJSON();
        obj.user = obj.userId;
        delete obj.userId;
        return obj;
      }),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/sales (admin)
export async function getSalesChart(req, res, next) {
  try {
    const { period = '7d' } = req.query;
    let startDate;

    switch (period) {
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          $or: [
            { paymentStatus: 'VERIFIED' }, 
            { status: { $in: ['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'] } }
          ]
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill missing dates with zero
    const result = [];
    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const existing = salesData.find(s => s._id === dateStr);
      result.push(existing || { _id: dateStr, revenue: 0, orders: 0 });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/best-sellers (admin)
export async function getBestSellers(_req, res, next) {
  try {
    const bestSellers = await Order.aggregate([
      { $match: { paymentStatus: 'VERIFIED' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.productName' },
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.totalPrice' },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]);

    res.json(bestSellers);
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/customers (admin)
export async function getCustomerStats(_req, res, next) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // New customers this month
    const newCustomers = await User.countDocuments({
      role: 'CUSTOMER',
      createdAt: { $gte: startOfMonth },
    });

    // Repeat customers (more than 1 order)
    const repeatCustomers = await Order.aggregate([
      { $group: { _id: '$userId', orderCount: { $sum: 1 } } },
      { $match: { orderCount: { $gt: 1 } } },
      { $count: 'count' },
    ]);

    // Top customers
    const topCustomers = await Order.aggregate([
      { $match: { paymentStatus: 'VERIFIED' } },
      {
        $group: {
          _id: '$userId',
          totalSpent: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          name: '$user.name',
          email: '$user.email',
          totalSpent: 1,
          orderCount: 1,
        },
      },
    ]);

    res.json({
      newCustomers,
      repeatCustomers: repeatCustomers[0]?.count || 0,
      topCustomers,
    });
  } catch (err) {
    next(err);
  }
}
