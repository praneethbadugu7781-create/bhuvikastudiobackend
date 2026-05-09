import Product from '../models/Product.js';

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// GET /api/products
export async function getAll(req, res, next) {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:id
export async function getOne(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

// Helper to transform image arrays
function transformImages(images) {
  if (!images || !Array.isArray(images)) return [];
  return images.map((url, i) => ({
    imageUrl: typeof url === 'string' ? url : url.imageUrl,
    altText: typeof url === 'string' ? null : url.altText,
    displayRank: typeof url === 'string' ? i : (url.displayRank ?? i),
  }));
}

// POST /api/products
export async function create(req, res, next) {
  try {
    const data = req.body;

    // Auto-generate slug if not provided
    if (!data.slug) {
      data.slug = slugify(data.name);
    }

    // Transform images from string array to object array
    if (data.images && Array.isArray(data.images)) {
      data.images = transformImages(data.images);
    }

    // Transform colorOptions images
    if (data.colorOptions && Array.isArray(data.colorOptions)) {
      data.colorOptions = data.colorOptions.map(color => ({
        colorName: color.colorName,
        colorCode: color.colorCode || '#000000',
        images: transformImages(color.images),
      }));
    }

    const product = await Product.create(data);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

// PUT /api/products/:id
export async function update(req, res, next) {
  try {
    const data = req.body;

    // Transform images from string array to object array
    if (data.images && Array.isArray(data.images)) {
      data.images = transformImages(data.images);
    }

    // Transform colorOptions images
    if (data.colorOptions && Array.isArray(data.colorOptions)) {
      data.colorOptions = data.colorOptions.map(color => ({
        colorName: color.colorName,
        colorCode: color.colorCode || '#000000',
        images: transformImages(color.images),
      }));
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });

    res.json(product);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/products/:id
export async function remove(req, res, next) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
