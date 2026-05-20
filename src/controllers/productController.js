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
    const { message, excludeSlugs = [], history = [] } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const products = await Product.find({ stockStatus: 'IN_STOCK' });

    // Filter out products that have already been recommended in this session to prevent repetition
    let filteredProducts = products.filter(p => !excludeSlugs.includes(p.slug));
    if (filteredProducts.length === 0) {
      filteredProducts = products; // Reset if all products have been excluded to keep showing items
    }

    const productsList = filteredProducts.map(p => {
      const firstVariant = p.variants?.[0];
      const price = firstVariant?.salePrice || firstVariant?.price || 0;
      return {
        name: p.name,
        category: p.category,
        price: price,
        slug: p.slug,
        color: firstVariant?.color || '',
        description: p.description || '',
      };
    });

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const systemInstruction = `You are Bhuvika's AI Personal Fashion Stylist. You help customers find ethnic wear like sarees, lehengas, and kids wear from Bhuvika Studio. You must recommend 1 to 4 products from the available catalog that match their query.
Provide your response strictly in the following JSON format:
{
  "text": "Your warm, helpful, personalized styling advice (max 3 sentences). Refer to specific occasions if mentioned.",
  "recommendedSlugs": ["slug1", "slug2"]
}
Do not return any markdown code block wraps (like \`\`\`json), just return the raw JSON object.`;

        // Map history to Gemini turns
        const geminiHistory = history.map(h => ({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        }));

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            },
            contents: [
              ...geminiHistory,
              {
                role: 'user',
                parts: [{ text: `User message: "${message}". Available catalog: ${JSON.stringify(productsList)}` }]
              }
            ]
          })
        });

        if (response.ok) {
          const result = await response.json();
          const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          
          let parsed;
          try {
            parsed = JSON.parse(cleanJson);
          } catch (e) {
            // Robust JSON extraction fallback
            const start = cleanJson.indexOf('{');
            const end = cleanJson.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
              parsed = JSON.parse(cleanJson.substring(start, end + 1));
            } else {
              throw e;
            }
          }

          return res.json({
            text: parsed.text,
            recommendedSlugs: parsed.recommendedSlugs || []
          });
        }
      } catch (geminiError) {
        console.error('Gemini API call failed, falling back to smart keyword search:', geminiError);
      }
    }

    // Smart Memory-Capable Fallback Keyword Search logic
    const lower = message.toLowerCase();
    const userMessages = history
      .filter(h => h.sender === 'user')
      .map(h => h.text.toLowerCase());
    userMessages.push(lower);
    const combinedQuery = userMessages.join(' ');

    const occasionKeywords = {
      'wedding': ['wedding', 'marriage', 'bride', 'bridal', 'groom', 'reception', 'shaadi', 'shadi', 'baraat', 'muhurtham'],
      'haldi': ['haldi', 'pellikuthuru', 'yellow function', 'ubtan'],
      'mehendi': ['mehendi', 'mehndi', 'henna', 'green function'],
      'sangeet': ['sangeet', 'dance', 'cocktail', 'music function'],
      'party': ['party', 'friends party', 'get together', 'evening wear', 'celebration', 'prom', 'dinner'],
      'festive': ['festive', 'festival', 'diwali', 'deepavali', 'dussehra', 'navratri', 'pooja', 'puja', 'eid', 'sankranti', 'pongal'],
      'casual': ['casual', 'daily wear', 'regular', 'office', 'workwear', 'simple wear']
    };

    let matchedOccasions = [];
    for (const [occ, keywords] of Object.entries(occasionKeywords)) {
      if (keywords.some(kw => combinedQuery.includes(kw))) {
        matchedOccasions.push(occ);
      }
    }

    const colorsList = [
      'yellow', 'mustard', 'red', 'crimson', 'maroon', 'green', 'emerald', 'mint', 'olive', 
      'blue', 'royal blue', 'navy', 'sky blue', 'pink', 'magenta', 'peach', 'rose', 
      'orange', 'rust', 'purple', 'lavender', 'violet', 'wine', 'white', 'ivory', 
      'cream', 'black', 'gold', 'golden', 'silver', 'grey', 'gray', 'pastel', 'multicolor'
    ];
    let matchedColors = colorsList.filter(color => combinedQuery.includes(color));

    const categoriesList = [
      { key: 'saree', keywords: ['saree', 'sari', 'sarees', 'saris'] },
      { key: 'lehenga', keywords: ['lehenga', 'choli', 'lehengas', 'ghagra'] },
      { key: 'kids wear', keywords: ['kids', 'child', 'children', 'baby', 'girl', 'boy', 'pattu pavadai', 'kids wear'] },
      { key: 'kurti', keywords: ['kurti', 'kurta', 'suit', 'salwar', 'sharara', 'gharara', 'anarkali'] }
    ];

    let matchedCategories = [];
    for (const cat of categoriesList) {
      if (cat.keywords.some(kw => combinedQuery.includes(kw))) {
        matchedCategories.push(cat.key);
      }
    }

    const fabricsList = ['silk', 'cotton', 'georgette', 'organza', 'chiffon', 'banarasi', 'kanchipuram', 'linen', 'crepe', 'satin', 'velvet'];
    let matchedFabrics = fabricsList.filter(fab => combinedQuery.includes(fab));

    const stylesList = ['designer', 'heavy', 'lightweight', 'simple', 'fancy', 'embroidered', 'printed', 'zari', 'traditional', 'modern', 'elegant'];
    let matchedStyles = stylesList.filter(style => combinedQuery.includes(style));

    let priceConstraint = null;
    const underMatch = combinedQuery.match(/(?:under|below|less than|within|budget of)\s*(?:rs\.?|inr|₹)?\s*(\d+)/i);
    const priceNumMatch = combinedQuery.match(/(?:rs\.?|inr|₹)?\s*(\d+)\s*(?:under|below|less than)/i);
    
    if (underMatch) {
      priceConstraint = { type: 'under', value: parseInt(underMatch[1], 10) };
    } else if (priceNumMatch) {
      priceConstraint = { type: 'under', value: parseInt(priceNumMatch[1], 10) };
    } else if (combinedQuery.includes('budget') || combinedQuery.includes('cheap') || combinedQuery.includes('affordable') || combinedQuery.includes('low price')) {
      priceConstraint = { type: 'under', value: 3000 };
    } else if (combinedQuery.includes('premium') || combinedQuery.includes('luxury') || combinedQuery.includes('expensive') || combinedQuery.includes('heavy') || combinedQuery.includes('rich')) {
      priceConstraint = { type: 'above', value: 5000 };
    }

    const scoredProducts = filteredProducts.map(p => {
      const firstVariant = p.variants?.[0];
      const price = firstVariant?.salePrice || firstVariant?.price || 0;
      const name = p.name.toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const cat = p.category.toLowerCase();
      const color = (firstVariant?.color || '').toLowerCase();

      let score = 0;

      // 1. Category Matching
      if (matchedCategories.length > 0) {
        if (matchedCategories.includes(cat)) {
          score += 15;
        } else {
          score -= 5;
        }
      }

      // 2. Color Matching
      for (const col of matchedColors) {
        if (color.includes(col) || name.includes(col) || desc.includes(col)) {
          score += 12;
        }
      }

      // 3. Occasion matching
      for (const occ of matchedOccasions) {
        if (occ === 'wedding' && (name.includes('silk') || name.includes('banarasi') || name.includes('kanchipuram') || name.includes('lehenga') || name.includes('heavy') || desc.includes('wedding') || desc.includes('bridal') || desc.includes('reception'))) {
          score += 8;
        }
        if (occ === 'haldi' && (color.includes('yellow') || name.includes('yellow') || name.includes('mustard') || desc.includes('yellow') || desc.includes('haldi'))) {
          score += 10;
        }
        if (occ === 'mehendi' && (color.includes('green') || name.includes('green') || name.includes('mint') || desc.includes('green') || desc.includes('mehendi'))) {
          score += 10;
        }
        if (occ === 'party' && (name.includes('designer') || name.includes('modern') || name.includes('fancy') || desc.includes('party') || desc.includes('evening') || cat.includes('gown') || cat.includes('lehenga'))) {
          score += 8;
        }
        if (occ === 'festive' && (name.includes('silk') || name.includes('zari') || name.includes('traditional') || desc.includes('festive') || desc.includes('festival') || desc.includes('pooja') || desc.includes('puja'))) {
          score += 8;
        }
      }

      // 4. Fabric Matching
      for (const fab of matchedFabrics) {
        if (name.includes(fab) || desc.includes(fab)) {
          score += 10;
        }
      }

      // 5. Style matching
      for (const style of matchedStyles) {
        if (name.includes(style) || desc.includes(style)) {
          score += 6;
        }
      }

      // 6. Price Constraint matching
      if (priceConstraint) {
        if (priceConstraint.type === 'under') {
          if (price <= priceConstraint.value) {
            score += 15;
          } else {
            score -= 10;
          }
        } else if (priceConstraint.type === 'above') {
          if (price >= priceConstraint.value) {
            score += 15;
          } else {
            score -= 8;
          }
        }
      }

      // 7. General search term matches
      const queryWords = combinedQuery.split(/\s+/).filter(w => w.length > 2);
      for (const word of queryWords) {
        if (name.includes(word)) score += 5;
        if (desc.includes(word)) score += 2;
      }

      // 8. Bestsellers/Featured/New arrivals bonus
      if (p.featured) score += 2;
      if (p.isBestSeller) score += 1.5;
      if (p.isNewArrival) score += 1;

      // Add random tie-breaker entropy to ensure variety on repeated or empty queries
      score += Math.random() * 0.5;

      return { product: p, score };
    });

    scoredProducts.sort((a, b) => b.score - a.score);

    let topScored = scoredProducts.filter(item => item.score > 0.5);
    if (topScored.length === 0) {
      topScored = scoredProducts;
    }

    let recommendedSlugs = topScored.slice(0, 3).map(item => item.product.slug);

    // Smart Personalized Response Generation
    let reply = "";
    const colorsText = matchedColors.length > 0 ? `${matchedColors.join('/')}` : "";
    const categoryText = matchedCategories.length > 0 ? `${matchedCategories.join('s and ')}s` : "designer outfits";
    const occasionText = matchedOccasions.length > 0 ? `for your ${matchedOccasions.join('/')} event` : "";
    const fabricText = matchedFabrics.length > 0 ? `crafted in premium ${matchedFabrics.join('/')}` : "";

    if (products.length <= 1) {
      const p = products[0];
      const prodName = p ? p.name : "designer outfit";
      const prodDesc = p ? (p.description || "premium clothing set").trim() : "";
      
      const singleReplies = [
        `We are currently showcasing our exclusive signature piece, the ${prodName} (${prodDesc})! It is beautifully tailored and perfect for any special occasion. Let me know if you would like styling tips for this look!`,
        `Bhuvika Studio is currently featuring our hand-crafted ${prodName} (${prodDesc}) as our boutique showcase today. It's a gorgeous outfit designed to stand out. How would you like to style this look?`,
        `Take a look at our highlighted boutique capsule piece: the elegant ${prodName} (${prodDesc})! It features gorgeous details and is highly popular. Let me know if you have questions about sizing or pairing accessories for this!`
      ];
      reply = singleReplies[Math.floor(Math.random() * singleReplies.length)];
    } else if (matchedColors.length > 0 || matchedCategories.length > 0 || matchedOccasions.length > 0) {
      const segments = [];
      if (colorsText) segments.push(colorsText);
      if (fabricText) segments.push(fabricText);
      if (categoryText) segments.push(categoryText);

      const descriptionOfSelection = segments.join(" ");
      const intros = [
        `Here are some stunning ${descriptionOfSelection} ${occasionText} that I think you will absolutely love!`,
        `I've handpicked these beautiful ${descriptionOfSelection} ${occasionText} from our latest collection.`,
        `For a perfect look, check out these exquisite ${descriptionOfSelection} ${occasionText} details.`
      ];

      reply = intros[Math.floor(Math.random() * intros.length)];
      if (priceConstraint) {
        reply += ` They are perfectly curated to match your budget preferences too!`;
      }
    } else {
      const generalReplies = [
        "Here are some of our most stunning and popular designer outfits from Bhuvika's latest collection! They feature gorgeous detailing and are perfect for any special occasion.",
        "Take a look at these highly recommended handpicked pieces from Bhuvika Studio. They are incredibly popular among our customers for their premium finish and elegant styling.",
        "I've selected some of our bestselling sarees and ethnic wear that look beautiful on any silhouette. Let me know if you would like to see specific colors or styles!"
      ];
      reply = generalReplies[Math.floor(Math.random() * generalReplies.length)];
    }

    res.json({
      text: reply,
      recommendedSlugs
    });
  } catch (err) {
    next(err);
  }
}
