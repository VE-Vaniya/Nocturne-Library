const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-not-a-real-secret';
// Empty values stop dotenv from loading real ones from a local .env file.
process.env.GOOGLE_BOOKS_API_KEY = '';
process.env.EMAIL_USER = '';
process.env.EMAIL_PASS = '';
process.env.CORS_ORIGINS = 'http://localhost:5173';

// Emails are never sent from tests.
jest.mock('../services/emailService', () => ({
  sendNotificationEmail: jest.fn().mockResolvedValue({ success: true }),
}));

beforeAll(async () => {
  const dbName = `test_${process.pid}_${Math.random().toString(36).slice(2, 10)}`;
  // The driver loads 'os' via dynamic import(), which Jest's VM sandbox
  // rejects without --experimental-vm-modules; hand it the module instead.
  await mongoose.connect(process.env.MONGO_TEST_URI, {
    dbName,
    serverSelectionTimeoutMS: 10000,
    runtimeAdapters: { os: require('os') },
  });
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
  jest.clearAllMocks();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
