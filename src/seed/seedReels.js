import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Reel from '../models/Reel.js';

dotenv.config();

const sampleReels = [
  {
    title: "Elegant Red Silk Saree Showcase",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-posing-with-a-red-sari-48959-large.mp4",
    coverImageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&auto=format&fit=crop&q=80",
    productLink: "/shop?category=Sarees",
    displayOrder: 1,
    isActive: true
  },
  {
    title: "Traditional Jewelry & Ethnic Wear styling",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-indian-woman-in-traditional-clothing-smiling-48956-large.mp4",
    coverImageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=500&auto=format&fit=crop&q=80",
    productLink: "/shop?category=Lehengas",
    displayOrder: 2,
    isActive: true
  },
  {
    title: "Trending Festive Season Lehenga Collection",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-fashion-woman-with-silver-glitter-makeup-40892-large.mp4",
    coverImageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop&q=80",
    productLink: "/shop?category=Lehengas",
    displayOrder: 3,
    isActive: true
  }
];

async function seedReels() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing reels
    await Reel.deleteMany({});
    console.log('Cleared existing reels');

    // Create sample reels
    await Reel.create(sampleReels);
    console.log('Seeded sample reels successfully!');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seedReels();
