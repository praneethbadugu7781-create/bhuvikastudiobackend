import Review from '../models/Review.js';
import Order from '../models/Order.js';

// GET /api/reviews (admin - all reviews)
export async function getAll(req, res, next) {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const reviews = await Review.find(filter)
      .populate('productId', 'name slug')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    next(err);
  }
}

// GET /api/reviews/product/:productId (public - approved only)
export async function getByProduct(req, res, next) {
  try {
    const reviews = await Review.find({
      productId: req.params.productId,
      status: 'APPROVED',
    })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    next(err);
  }
}

// POST /api/reviews (customer)
export async function create(req, res, next) {
  try {
    const userId = req.user.userId;
    const { productId, orderId, rating, title, comment, images } = req.body;

    // Check if user has purchased this product
    let isVerifiedPurchase = false;
    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        userId,
        'items.productId': productId,
        status: 'DELIVERED',
      });
      isVerifiedPurchase = !!order;
    }

    const review = await Review.create({
      productId,
      userId,
      orderId,
      rating,
      title,
      comment,
      images: images || [],
      isVerifiedPurchase,
      status: 'PENDING',
    });

    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
}

// PUT /api/reviews/:id/status (admin)
export async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    )
      .populate('productId', 'name slug')
      .populate('userId', 'name email');

    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json(review);
  } catch (err) {
    next(err);
  }
}

// PUT /api/reviews/:id/reply (admin)
export async function addReply(req, res, next) {
  try {
    const { reply } = req.body;

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { $set: { adminReply: reply, adminReplyAt: new Date() } },
      { new: true }
    )
      .populate('productId', 'name slug')
      .populate('userId', 'name email');

    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json(review);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/reviews/:id (admin)
export async function remove(req, res, next) {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/reviews/stats (admin)
export async function getStats(_req, res, next) {
  try {
    const stats = await Review.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const result = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    stats.forEach(s => { result[s._id] = s.count; });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
