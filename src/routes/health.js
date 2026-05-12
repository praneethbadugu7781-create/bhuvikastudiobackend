import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/live', (req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

router.get('/ready', async (req, res) => {
  try {
    const dbCheck = mongoose.connection.readyState === 1;

    const checks = {
      db: dbCheck ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
    };

    const allHealthy = Object.values(checks).every(v => v === 'healthy' || typeof v === 'string');

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ready' : 'not-ready',
      checks,
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      error: err.message,
    });
  }
});

export default router;
