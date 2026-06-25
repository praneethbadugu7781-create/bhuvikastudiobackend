import dotenv from 'dotenv';
import mongoose from 'mongoose';
import SizeChart from '../models/SizeChart.js';

dotenv.config();

const categories = [
  "Kurta Sets",
  "Sarees",
  "Lehengas",
  "Indo Western",
  "Fusion Wear",
  "Kids Wear",
  "Western Wear",
  "Co-ords Sets",
  "Anarkali",
  "Gowns"
];

const defaultStandardMeasurements = [
  { size: "M", chest: "36", waist: "34", hip: "38", length: "30", ageRange: "" },
  { size: "L", chest: "38", waist: "36", hip: "40", length: "32", ageRange: "" },
  { size: "XL", chest: "40", waist: "38", hip: "42", length: "34", ageRange: "" },
  { size: "XXL", chest: "42", waist: "40", hip: "44", length: "36", ageRange: "" }
];

const defaultKidsMeasurements = [
  { size: "18", chest: "", waist: "", hip: "", length: "", ageRange: "1–2 Years" },
  { size: "20", chest: "", waist: "", hip: "", length: "", ageRange: "2–3 Years" },
  { size: "22", chest: "", waist: "", hip: "", length: "", ageRange: "3–4 Years" },
  { size: "24", chest: "", waist: "", hip: "", length: "", ageRange: "4–5 Years" },
  { size: "26", chest: "", waist: "", hip: "", length: "", ageRange: "5–6 Years" },
  { size: "28", chest: "", waist: "", hip: "", length: "", ageRange: "7–8 Years" },
  { size: "30", chest: "", waist: "", hip: "", length: "", ageRange: "9–10 Years" },
  { size: "32", chest: "", waist: "", hip: "", length: "", ageRange: "11–12 Years" },
  { size: "34", chest: "", waist: "", hip: "", length: "", ageRange: "13–14 Years" }
];

async function seedSizeCharts() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("MONGODB_URI not found in env variables.");
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const category of categories) {
      const isKids = category === "Kids Wear";
      const type = isKids ? "kids" : "standard";
      const measurements = isKids ? defaultKidsMeasurements : defaultStandardMeasurements;

      await SizeChart.findOneAndUpdate(
        { category },
        { type, measurements },
        { upsert: true, new: true }
      );
      console.log(`Seeded size chart for category: ${category} (${type})`);
    }

    console.log('Seeding size charts completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seedSizeCharts();
