import SizeChart from '../models/SizeChart.js';

export async function getAll(req, res, next) {
  try {
    const charts = await SizeChart.find().sort({ category: 1 });
    res.json(charts);
  } catch (err) {
    next(err);
  }
}

export async function getByCategory(req, res, next) {
  try {
    const category = decodeURIComponent(req.params.category);
    const chart = await SizeChart.findOne({ category });
    if (!chart) return res.status(404).json({ error: 'Size chart not found' });
    res.json(chart);
  } catch (err) {
    next(err);
  }
}

export async function upsert(req, res, next) {
  try {
    const category = decodeURIComponent(req.params.category);
    const { type, measurements } = req.body;
    const chart = await SizeChart.findOneAndUpdate(
      { category },
      { type, measurements },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(chart);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const category = decodeURIComponent(req.params.category);
    const chart = await SizeChart.findOneAndDelete({ category });
    if (!chart) return res.status(404).json({ error: 'Size chart not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
