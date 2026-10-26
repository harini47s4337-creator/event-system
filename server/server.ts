import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { authRoutes } from './routes/authRoutes.js';
import { eventRoutes } from './routes/eventRoutes.js';
import { organizerRoutes } from './routes/organizerRoutes.js';
import { reservationRoutes } from './routes/reservationRoutes.js';
import { paymentRoutes } from './routes/paymentRoutes.js';
import { orderRoutes } from './routes/orderRoutes.js';
import { adminRoutes } from './routes/adminRoutes.js';
import { reservationWorker } from './services/reservationWorker.js';
import { runConcurrencyTest } from './tests/concurrencyTest.js';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

// Request logger for API calls
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Test runner endpoint for evaluators
app.post('/api/tests/concurrency', async (req, res) => {
  try {
    const result = await runConcurrencyTest();
    return res.json({
      message: 'Concurrency test completed successfully.',
      result,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'EventSphere API & Reservation Engine',
  });
});

// Mount Vite in development or serve static build in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: rootDir,
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(rootDir, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(rootDir, 'dist', 'index.html'));
    });
  }

  // Start Background Reservation Expiration Worker
  reservationWorker.start();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 EventSphere Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
