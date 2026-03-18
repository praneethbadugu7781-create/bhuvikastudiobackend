import Coupon from '../models/Coupon.js';

// GET /api/coupons (admin)
export async function getAll(_req, res, next) {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    next(err);
  }
}

// POST /api/coupons (admin)
export async function create(req, res, next) {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json(coupon);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }
    next(err);
  }
}

// PUT /api/coupons/:id (admin)
export async function update(req, res, next) {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
    res.json(coupon);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/coupons/:id (admin)
export async function remove(req, res, next) {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// POST /api/coupons/validate (customer)
export async function validate(req, res, next) {
  try {
    const { code, cartTotal } = req.body;

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      validFrom: { $lte: new Date() },
      validUntil: { $gte: new Date() },
    });

    if (!coupon) {
      return res.status(400).json({ error: 'Invalid or expired coupon code' });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }

    if (cartTotal < coupon.minCartValue) {
      return res.status(400).json({
        error: `Minimum cart value ₹${coupon.minCartValue} required`,
      });
    }

    let discount = 0;
    if (coupon.type === 'PERCENT') {
      discount = Math.round((cartTotal * coupon.value) / 100);
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.value;
    }

    res.json({
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      maxDiscount: coupon.maxDiscount,
      discount,
      description: coupon.description,
    });
  } catch (err) {
    next(err);
  }
}
