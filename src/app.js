const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const pool = require('./config/db');
const { register, metricsMiddleware } = require('./config/metrics');
const bookRoutes = require('./routes/bookRoutes');
const loanRoutes = require('./routes/loanRoutes');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan((tokens, req, res) => {
  return JSON.stringify({
    level: 'INFO',
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    responseTime: tokens['response-time'](req, res) + 'ms',
    timestamp: new Date().toISOString(),
  });
}));
app.use(metricsMiddleware);

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: 'Library API Docs',
}));
app.get('/api-docs.json', (req, res) => {
  res.json(swaggerSpec);
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'UP', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'DOWN', timestamp: new Date().toISOString() });
  }
});

// Metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Routes (loan routes first so /loans matches before /:id)
app.use('/api/v1/books', loanRoutes);
app.use('/api/v1/books', bookRoutes);
app.use('/api/v1/auth', authRoutes);

// Error handler
app.use(errorHandler);

module.exports = app;
