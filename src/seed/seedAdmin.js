import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = process.env.ADMIN_EMAIL || 'admin@bhuvikastudio.com';
    const password = process.env.ADMIN_PASSWORD || 'BhuvikaAdmin123';

    // Check if admin already exists
    const existing = await User.findOne({ email, role: 'ADMIN' });
    if (existing) {
      console.log(`Admin already exists: ${email}`);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name: 'Bhuvika Admin',
      email,
      role: 'ADMIN',
      password: hashedPassword,
    });

    console.log(`Admin user created successfully!`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log('  Change this password after first login!');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seedAdmin();
