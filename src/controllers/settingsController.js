import Settings from '../models/Settings.js';

// Default shipping settings
const DEFAULT_SHIPPING = {
  freeThreshold: 2000,
  defaultCharge: 80,
  codEnabled: true,
  codCharge: 0,
  zones: [],
};

// GET /api/settings/shipping
export async function getShipping(_req, res, next) {
  try {
    const settings = await Settings.findOne({ key: 'shipping' });
    res.json(settings?.value || DEFAULT_SHIPPING);
  } catch (err) {
    next(err);
  }
}

// PUT /api/settings/shipping (admin)
export async function updateShipping(req, res, next) {
  try {
    const { freeThreshold, defaultCharge, codEnabled, codCharge, zones } = req.body;

    const value = {
      freeThreshold: freeThreshold ?? DEFAULT_SHIPPING.freeThreshold,
      defaultCharge: defaultCharge ?? DEFAULT_SHIPPING.defaultCharge,
      codEnabled: codEnabled ?? DEFAULT_SHIPPING.codEnabled,
      codCharge: codCharge ?? DEFAULT_SHIPPING.codCharge,
      zones: zones || [],
    };

    const settings = await Settings.findOneAndUpdate(
      { key: 'shipping' },
      { $set: { value } },
      { upsert: true, new: true }
    );

    res.json(settings.value);
  } catch (err) {
    next(err);
  }
}

const DEFAULT_PROMO = {
  text: "Welcome to Bhuvika Studio! Free Shipping on orders above ₹1999!",
  enabled: true,
};

// GET /api/settings/promo
export async function getPromo(_req, res, next) {
  try {
    const settings = await Settings.findOne({ key: 'promo' });
    res.json(settings?.value || DEFAULT_PROMO);
  } catch (err) {
    next(err);
  }
}

// PUT /api/settings/promo (admin)
export async function updatePromo(req, res, next) {
  try {
    const { text, enabled } = req.body;
    const value = {
      text: text ?? DEFAULT_PROMO.text,
      enabled: enabled ?? DEFAULT_PROMO.enabled,
    };
    const settings = await Settings.findOneAndUpdate(
      { key: 'promo' },
      { $set: { value } },
      { upsert: true, new: true }
    );
    res.json(settings.value);
  } catch (err) {
    next(err);
  }
}

// GET /api/settings/all (admin) - Get all settings
export async function getAll(_req, res, next) {
  try {
    const settings = await Settings.find();
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });
    if (!result.shipping) result.shipping = DEFAULT_SHIPPING;
    if (!result.promo) result.promo = DEFAULT_PROMO;
    res.json(result);
  } catch (err) {
    next(err);
  }
}
