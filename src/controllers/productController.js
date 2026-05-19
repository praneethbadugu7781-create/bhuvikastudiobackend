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

// POST /api/products/chat-stylist
export async function chatStylist(req, res, next) {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const products = await Product.find({ stock: 'In Stock' });

    const productsList = products.map(p => ({
      name: p.name,
      category: p.category,
      price: p.price,
      slug: p.slug,
      color: p.color,
      description: p.description || '',
    }));

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const prompt = `You are Bhuvika's AI Personal Fashion Stylist. You help customers find ethnic wear like sarees, lehengas, and kids wear from Bhuvika Studio.
Here is the available product catalog:
${JSON.stringify(productsList)}

The user asks: "${message}"

You must recommend 1 to 4 products from the catalog that match their query.
Provide your response strictly in the following JSON format:
{
  "text": "Your warm, helpful, personalized styling advice (max 3 sentences). Refer to specific occasions if mentioned.",
  "recommendedSlugs": ["slug1", "slug2"]
}
Do not return any markdown code block wraps (like \`\`\`json), just return the raw JSON object.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        if (response.ok) {
          const result = await response.json();
          const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          return res.json({
            text: parsed.text,
            recommendedSlugs: parsed.recommendedSlugs || []
          });
        }
      } catch (geminiError) {
        console.error('Gemini API call failed, falling back to keyword search:', geminiError);
      }
    }

    // Fallback Keyword Search logic
    const lower = message.toLowerCase();
    let matched = [];
    
    let occasion = '';
    if (lower.includes('wedding') || lower.includes('marriage') || lower.includes('reception')) {
      occasion = 'wedding/reception';
    } else if (lower.includes('haldi') || lower.includes('yellow')) {
      occasion = 'haldi ceremony';
    } else if (lower.includes('party') || lower.includes('festival') || lower.includes('diwali')) {
      occasion = 'festive celebrations';
    }

    for (const p of products) {
      const name = p.name.toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const cat = p.category.toLowerCase();
      const color = (p.color || '').toLowerCase();

      let score = 0;
      if (color && lower.includes(color)) score += 3;
      if (lower.includes(cat) || (cat === 'saree' && lower.includes('sarees'))) score += 2;
      if (lower.includes(name)) score += 5;
      
      if (occasion === 'haldi ceremony' && (color.includes('yellow') || name.includes('yellow') || desc.includes('yellow'))) score += 4;
      if (occasion === 'wedding/reception' && (name.includes('silk') || name.includes('pure') || desc.includes('silk') || name.includes('sharara') || name.includes('lehenga'))) score += 2;

      if (score > 0) {
        matched.push({ slug: p.slug, score });
      }
    }

    matched.sort((a, b) => b.score - a.score);
    const recommendedSlugs = matched.slice(0, 3).map(m => m.slug);

    let reply = "Here are some handpicked outfits from our boutique that match your styling preference!";
    if (occasion) {
      reply = `For your upcoming ${occasion}, here are some beautiful and elegant options from Bhuvika's designer collection!`;
    }

    res.json({
      text: reply,
      recommendedSlugs
    });
  } catch (err) {
    next(err);
  }
}
