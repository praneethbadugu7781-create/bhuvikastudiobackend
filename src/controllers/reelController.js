import Reel from '../models/Reel.js';

// GET /api/reels (public - active only)
export async function getActive(_req, res, next) {
  try {
    const reels = await Reel.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 });
    res.json(reels);
  } catch (err) {
    next(err);
  }
}

// GET /api/reels/all (admin - all reels)
export async function getAll(_req, res, next) {
  try {
    const reels = await Reel.find().sort({ displayOrder: 1, createdAt: -1 });
    res.json(reels);
  } catch (err) {
    next(err);
  }
}

// POST /api/reels (admin)
export async function create(req, res, next) {
  try {
    const reel = await Reel.create(req.body);
    res.status(201).json(reel);
  } catch (err) {
    next(err);
  }
}

// PUT /api/reels/:id (admin)
export async function update(req, res, next) {
  try {
    const reel = await Reel.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!reel) return res.status(404).json({ error: 'Reel not found' });
    res.json(reel);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/reels/:id (admin)
export async function remove(req, res, next) {
  try {
    const reel = await Reel.findByIdAndDelete(req.params.id);
    if (!reel) return res.status(404).json({ error: 'Reel not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// PUT /api/reels/:id/toggle (admin)
export async function toggle(req, res, next) {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ error: 'Reel not found' });

    reel.isActive = !reel.isActive;
    await reel.save();
    res.json(reel);
  } catch (err) {
    next(err);
  }
}
