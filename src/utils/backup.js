import cron from 'node-cron';
import mongoose from 'mongoose';
import logger from './logger.js';

export function scheduleBackups() {
  const schedule = process.env.BACKUP_SCHEDULE || '0 2 * * *';

  cron.schedule(schedule, async () => {
    try {
      await performBackup();
    } catch (err) {
      logger.error(`Backup failed: ${err.message}`);
    }
  });

  logger.info(`Backup scheduled: ${schedule}`);
}

export async function performBackup() {
  try {
    logger.info('Starting database backup...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `backups/bhuvika-${timestamp}.json`;

    const collections = mongoose.connection.collections;
    const backup = {};

    for (const [name, collection] of Object.entries(collections)) {
      const docs = await collection.find({}).toArray();
      backup[name] = docs;
    }

    logger.info(`Backup created: ${backupPath} with ${Object.keys(backup).length} collections`);

    return backup;
  } catch (err) {
    logger.error(`Backup error: ${err.message}`);
    throw err;
  }
}

export async function restoreBackup(backup) {
  try {
    logger.warn('Starting database restore...');

    for (const [collectionName, docs] of Object.entries(backup)) {
      const collection = mongoose.connection.collection(collectionName);
      if (docs.length > 0) {
        await collection.insertMany(docs);
      }
    }

    logger.info('Database restore completed');
  } catch (err) {
    logger.error(`Restore error: ${err.message}`);
    throw err;
  }
}
