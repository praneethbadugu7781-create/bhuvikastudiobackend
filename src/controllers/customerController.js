import User from '../models/User.js';
import Order from '../models/Order.js';

// GET /api/customers
export async function getAll(_req, res, next) {
  try {
    const customers = await User.find({ role: 'CUSTOMER' })
      .select('name email mobile createdAt')
      .sort({ createdAt: -1 });

    // Fetch orders for each customer
    const result = await Promise.all(
      customers.map(async (c) => {
        const orders = await Order.find({ userId: c._id })
          .select('totalAmount status createdAt')
          .sort({ createdAt: -1 });

        return {
          ...c.toJSON(),
          orders,
        };
      })
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}
