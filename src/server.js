import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db.js';
import { initSentry } from './config/sentry.js';
import corsOptions from './config/cors.js';
import { generalLimiter } from './config/rateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';
import { scheduleBackups } from './utils/backup.js';
import logger from './utils/logger.js';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import customerRoutes from './routes/customers.js';
import statsRoutes from './routes/stats.js';
import paymentRoutes from './routes/payments.js';
import uploadRoutes from './routes/upload.js';
import settingsRoutes from './routes/settings.js';
import couponRoutes from './routes/coupons.js';
import bannerRoutes from './routes/banners.js';
import reviewRoutes from './routes/reviews.js';
import analyticsRoutes from './routes/analytics.js';
import addressRoutes from './routes/addresses.js';
import healthRoutes from './routes/health.js';
import reelRoutes from './routes/reels.js';
import sizeChartRoutes from './routes/sizeCharts.js';

initSentry();

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(generalLimiter);

app.use('/api/health', healthRoutes);
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api/size-charts', sizeChartRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`Bhuvika Studio API running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    scheduleBackups();
  });
});
