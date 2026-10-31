import { createElysiaApp } from '../app.ts';

declare var self: Worker;

const PORT = parseInt(process.env.PORT || '3000', 10);
const workerId = process.env.WORKER_ID || '1';

const app = createElysiaApp();

const server = app.listen({
  port: PORT,
  reusePort: true, // Kernel-level load balancing across threads
});

console.log(`[Worker #${workerId}] Listening on port ${PORT} (PID: ${process.pid})`);

if (typeof self !== 'undefined' && self.postMessage) {
  self.postMessage({ type: 'READY', workerId, port: PORT });
}
