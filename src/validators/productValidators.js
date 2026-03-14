import Joi from 'joi';

const variantSchema = Joi.object({
  sku: Joi.string().required(),
  size: Joi.string().required(),
  color: Joi.string().allow('').default(''),
  price: Joi.number().positive().required(),
  salePrice: Joi.number().positive().allow(null).optional(),
  stockQuantity: Joi.number().integer().min(0).default(0),
});

export const createProductSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  slug: Joi.string().optional(),
  description: Joi.string().allow('').default(''),
  category: Joi.string().required(),
  featured: Joi.boolean().default(false),
  isNewArrival: Joi.boolean().default(false),
  isBestSeller: Joi.boolean().default(false),
  stockStatus: Joi.string().valid('IN_STOCK', 'OUT_OF_STOCK').default('IN_STOCK'),
  variants: Joi.array().items(variantSchema).optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
});

export const updateProductSchema = createProductSchema.fork(
  ['name', 'category'],
  (field) => field.optional()
);
