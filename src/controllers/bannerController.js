import Banner from '../models/Banner.js';

// GET /api/banners (public - active only)
export async function getActive(_req, res, next) {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ position: 1, displayOrder: 1 });
    res.json(banners);
  } catch (err) {
    next(err);
  }
}

// GET /api/banners/all (admin - all banners)
export async function getAll(_req, res, next) {
  try {
    const banners = await Banner.find().sort({ position: 1, displayOrder: 1 });
    res.json(banners);
  } catch (err) {
    next(err);
  }
}

// POST /api/banners (admin)
export async function create(req, res, next) {
  try {
    const banner = await Banner.create(req.body);
    res.status(201).json(banner);
  } catch (err) {
    next(err);
  }
}

// PUT /api/banners/:id (admin)
export async function update(req, res, next) {
  try {
    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    res.json(banner);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/banners/:id (admin)
export async function remove(req, res, next) {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// PUT /api/banners/:id/toggle (admin)
export async function toggle(req, res, next) {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });

    banner.isActive = !banner.isActive;
    await banner.save();
    res.json(banner);
  } catch (err) {
    next(err);
  }
}
