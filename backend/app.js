const express = require('express');
const cors = require('cors');
require('dotenv').config({ quiet: true });

const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// The Express application. No database connection and no listen() here so
// tests can import it directly (see server.js for the process entry point).
const app = express();

// Behind exactly one proxy (ALB / nginx): use X-Forwarded-For for req.ip so
// the auth rate limiter keys on the real client address.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Health checks (no auth, before CORS/body parsing):
// /health = liveness, /api/health = readiness (DB connected)
app.use(require('./routes/healthRoutes'));

// CORS: only allow origins listed in CORS_ORIGINS (comma-separated).
// Defaults to the Vite dev server outside production. Requests without an
// Origin header (same-origin, curl, health checks) are always allowed.
const corsOrigins = (
  process.env.CORS_ORIGINS || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173')
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, !origin || corsOrigins.includes(origin));
    },
  }),
);

// Book covers are uploaded as base64 data URLs inside the JSON body, so the
// limit must leave room for an image (~7.5 MB raw at 10 MB). Override with
// BODY_LIMIT if needed.
const bodyLimit = process.env.BODY_LIMIT || '10mb';
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ limit: bodyLimit, extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/quotes', require('./routes/quoteRoutes'));
app.use('/api/books', require('./routes/bookRoutes'));
app.use('/api/missives', require('./routes/missiveRoutes'));
app.use('/api/search', require('./routes/searchRoutes'));

// Basic Route
app.get('/', (req, res) => {
  res.send('Nocturne Library API is running...');
});

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
