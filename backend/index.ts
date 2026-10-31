import os from 'node:os';
import { app } from './src/app.ts';

const PORT = parseInt(process.env.PORT || '3000', 10);
const isSingleThread = process.env.SINGLE_THREAD === 'true';

// Multi-thread configuration: default to available CPU cores (capped between 2 and 8)
const detectedCpus = os.cpus().length || 4;
const DEFAULT_THREADS = Math.max(2, Math.min(detectedCpus, 8));
const THREAD_COUNT = process.env.THREADS ? parseInt(process.env.THREADS, 10) : DEFAULT_THREADS;

// Sanitize environment variables for workers
const workerEnv = Object.fromEntries(
  Object.entries(process.env).filter(([_, v]) => typeof v === 'string')
) as Record<string, string>;

if (isSingleThread || THREAD_COUNT <= 1) {
  // Single-threaded mode (useful for testing or debugging)
  console.log(`Starting Elysia server in single-threaded mode on port ${PORT}...`);
  app.listen(PORT);
  console.log(`🚀 Brightloop Elysia server running at http://localhost:${PORT}`);
  console.log(`📖 Swagger API Docs available at http://localhost:${PORT}/swagger`);
} else {
  // Multi-threaded cluster using Bun Worker threads + reusePort
  console.log(`====================================================`);
  console.log(`🚀 Starting Brightloop Elysia Multi-Threaded Cluster`);
  console.log(`⚡ Number of Worker Threads: ${THREAD_COUNT}`);
  console.log(`⚡ Port: ${PORT} (SO_REUSEPORT enabled across all threads)`);
  console.log(`====================================================`);

  const workers: Worker[] = [];

  for (let i = 1; i <= THREAD_COUNT; i++) {
    const workerUrl = new URL('./src/workers/http.worker.ts', import.meta.url);
    const worker = new Worker(workerUrl.href, {
      env: {
        ...workerEnv,
        PORT: PORT.toString(),
        WORKER_ID: i.toString(),
      },
    });

    worker.onerror = (err) => {
      console.error(`[Worker #${i} Error]:`, err);
    };

    workers.push(worker);
  }

  // Dedicated background billing worker thread for CPU/batch tasks
  const billingWorkerUrl = new URL('./src/workers/billing.worker.ts', import.meta.url);
  const billingWorker = new Worker(billingWorkerUrl.href, {
    env: workerEnv,
  });

  console.log(`📖 Swagger API Docs available at http://localhost:${PORT}/swagger`);

  // Handle graceful shutdown
  const cleanup = () => {
    console.log('\nShutting down workers gracefully...');
    for (const w of workers) {
      w.terminate();
    }
    billingWorker.terminate();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

export { app };
