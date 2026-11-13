const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();

// Health checks (no auth, before CORS/body parsing):
// /health = liveness, /api/health = readiness (DB connected)
app.use(require('./routes/healthRoutes'));

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Connect to the database first, then start listening. Exit if the DB
// can't be reached so the orchestrator restarts us.
const startServer = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = app;
