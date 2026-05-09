import { Router } from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import { authenticate, requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

// POST /api/upload — upload image to Cloudinary
router.post('/', authenticate, requireAuth, requireAdmin, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const b64 = req.file.buffer.toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'bhuvika-studio',
      resource_type: 'image',
    });

    res.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    next(err);
  }
});

// POST /api/upload/multiple — upload multiple images
router.post('/multiple', authenticate, requireAuth, requireAdmin, upload.array('images', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const uploads = await Promise.all(
      req.files.map(async (file) => {
        const b64 = file.buffer.toString('base64');
        const dataUri = `data:${file.mimetype};base64,${b64}`;
        const result = await cloudinary.uploader.upload(dataUri, {
          folder: 'bhuvika-studio',
          resource_type: 'image',
        });
        return result.secure_url;
      })
    );

    res.json({ urls: uploads });
  } catch (err) {
    next(err);
  }
});

export default router;
