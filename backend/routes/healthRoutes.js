const express = require('express');
const mongoose = require('mongoose');

// Image tag of the running build (set by docker-compose.prod.yml from the
// deployed IMAGE_TAG), so anyone can see which commit is live: GET /api/health.
const version = process.env.APP_VERSION || 'dev';

// Liveness: is the process up? Never touches the database, so the load
// balancer / ASG won't recycle healthy instances during a DB outage.
const liveness = (req, res) => {
  res.status(200).json({ status: 'ok', version, uptime: process.uptime() });
};

// Readiness: can we actually serve requests (DB connected)?
const readiness = (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'degraded',
    db: connected ? 'connected' : 'disconnected',
    version,
    uptime: process.uptime(),
  });
};

const router = express.Router();
router.get('/health', liveness);
router.get('/api/health', readiness);

module.exports = router;
module.exports.liveness = liveness;
module.exports.readiness = readiness;
