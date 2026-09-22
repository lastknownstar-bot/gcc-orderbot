import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { chatRouter } from './routes/chat.js';
import { webhookRouter } from './routes/webhook.js';
import { ordersRouter } from './routes/orders.js';
import { productsRouter } from './routes/products.js';
import { merchantRouter, conversationsRouter } from './routes/merchant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors({ 
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/chat', chatRouter);
app.use('/api/webhook', webhookRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/products', productsRouter);
app.use('/api/merchant', merchantRouter);
app.use('/api/conversations', conversationsRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'GCC-OrderBot API',
    version: '1.0.0',
    geminiActive: !!config.geminiApiKey,
    currency: config.merchant.defaultCurrency,
    country: config.merchant.defaultCountry,
    time: new Date().toISOString()
  });
});

// Serve frontend in production if built
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res.send(`
        <html>
          <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc;">
            <h2>GCC-OrderBot Backend Server is running on port ${config.port} 🚀</h2>
            <p>To access the full UI, run the Vite client with <code>npm run dev</code></p>
            <p>API Health: <a style="color: #38bdf8;" href="/api/health">/api/health</a></p>
          </body>
        </html>
      `);
    }
  });
});

app.listen(config.port, () => {
  console.log(`
  ======================================================
  🌴 GCC-OrderBot Engine Started
  📡 Port: http://localhost:${config.port}
  💬 WhatsApp Simulator: Ready
  🧠 Gemini AI Engine: ${config.geminiApiKey ? 'Connected (Gemini 2.5 Flash)' : 'Smart Khaleeji Heuristic Fallback (Active)'}
  💳 Regional Gateways: BenefitPay (Bahrain) / Tap Payments (GCC)
  ======================================================
  `);
});
