// queue.js - shared Redis connection + queue (imported by the Express app AND the worker)
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// BullMQ requires maxRetriesPerRequest: null
const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

const QUEUE_NAME = 'pdf-processing';

const pdfQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,                                   // retry failed jobs
    backoff: { type: 'exponential', delay: 2000 }, // 2s, 4s, 8s...
    removeOnComplete: { age: 3600, count: 100 },   // keep Redis tidy
    removeOnFail: { age: 24 * 3600 },
  },
});

module.exports = { pdfQueue, connection, QUEUE_NAME };