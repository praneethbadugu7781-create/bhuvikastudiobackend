import Address from '../models/Address.js';

// GET /api/addresses - Get all addresses for logged-in user
export async function getAll(req, res, next) {
  try {
    const addresses = await Address.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    res.json(addresses);
  } catch (err) {
    next(err);
  }
}

// POST /api/addresses - Create new address
export async function create(req, res, next) {
  try {
    const { fullName, phone, line1, line2, city, state, postalCode, isDefault } = req.body;

    // If this is the first address, make it default
    const existingCount = await Address.countDocuments({ userId: req.user._id });
    const shouldBeDefault = existingCount === 0 ? true : isDefault;

    const address = await Address.create({
      userId: req.user._id,
      fullName,
      phone,
      line1,
      line2: line2 || '',
      city,
      state: state || 'Andhra Pradesh',
      postalCode,
      isDefault: shouldBeDefault,
    });

    res.status(201).json(address);
  } catch (err) {
    next(err);
  }
}

// PUT /api/addresses/:id - Update address
export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { fullName, phone, line1, line2, city, state, postalCode, isDefault } = req.body;

    const address = await Address.findOne({ _id: id, userId: req.user._id });
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    if (fullName) address.fullName = fullName;
    if (phone) address.phone = phone;
    if (line1) address.line1 = line1;
    if (line2 !== undefined) address.line2 = line2;
    if (city) address.city = city;
    if (state) address.state = state;
    if (postalCode) address.postalCode = postalCode;
    if (isDefault !== undefined) address.isDefault = isDefault;

    await address.save();
    res.json(address);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/addresses/:id - Delete address
export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const address = await Address.findOneAndDelete({ _id: id, userId: req.user._id });

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // If deleted address was default, make another one default
    if (address.isDefault) {
      const nextAddress = await Address.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save();
      }
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// PUT /api/addresses/:id/default - Set as default address
export async function setDefault(req, res, next) {
  try {
    const { id } = req.params;
    const address = await Address.findOne({ _id: id, userId: req.user._id });

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    address.isDefault = true;
    await address.save();

    res.json(address);
  } catch (err) {
    next(err);
  }
}
