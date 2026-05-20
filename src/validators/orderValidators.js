import Joi from 'joi';

export const createOrderSchema = Joi.object({
  address: Joi.object({
    fullName: Joi.string().required(),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).required().messages({
      'string.pattern.base': 'Invalid Indian phone number',
    }),
    line1: Joi.string().required(),
    line2: Joi.string().allow('', null).optional(),
    city: Joi.string().required(),
    state: Joi.string().default('Andhra Pradesh'),
    postalCode: Joi.string().pattern(/^\d{6}$/).required().messages({
      'string.pattern.base': 'Invalid PIN code',
    }),
  }).required(),
  paymentMethod: Joi.string().valid('UPI', 'COD', 'CASHFREE').default('COD'),
  items: Joi.array().items(Joi.object({
    slug: Joi.string().required(),
    size: Joi.string().required(),
    qty: Joi.number().integer().min(1).required(),
  })).min(1).required(),
  couponCode: Joi.string().allow(null, '').optional(),
  couponDiscount: Joi.number().min(0).default(0),
});

export const updateOrderSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED').optional(),
  paymentStatus: Joi.string().valid('PENDING', 'VERIFIED', 'REJECTED').optional(),
  adminNote: Joi.string().allow('', null).optional(),
  trackingNumber: Joi.string().allow('', null).optional(),
  courierCompany: Joi.string().allow('', null).optional(),
  trackingUrl: Joi.string().allow('', null).optional(),
});

export const returnRequestSchema = Joi.object({
  returnReason: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Return reason must be at least 10 characters',
    'any.required': 'Return reason is required',
  }),
});

export const returnCourierSchema = Joi.object({
  returnCourierCompany: Joi.string().required().messages({
    'any.required': 'Courier company is required',
  }),
  returnTrackingNumber: Joi.string().required().messages({
    'any.required': 'Tracking number is required',
  }),
});

export const adminReturnActionSchema = Joi.object({
  action: Joi.string().valid('APPROVE', 'REJECT', 'MARK_RECEIVED', 'REFUND').required(),
  refundAmount: Joi.number().min(0).optional(),
  refundNote: Joi.string().allow('', null).optional(),
  adminNote: Joi.string().allow('', null).optional(),
});
