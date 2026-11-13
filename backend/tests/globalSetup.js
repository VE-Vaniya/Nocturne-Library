const { MongoMemoryServer } = require('mongodb-memory-server');

// One in-memory MongoDB for the whole run; each test file uses its own
// database on it (see tests/setup.js).
module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  globalThis.__MONGOD__ = mongod;
  process.env.MONGO_TEST_URI = mongod.getUri();
};
