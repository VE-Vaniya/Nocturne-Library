require('dotenv').config({ quiet: true });
const app = require('./app');
const connectDB = require('./config/db');

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
  return app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
