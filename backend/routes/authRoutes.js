const express = require('express');
const { rateLimit } = require('express-rate-limit');
const router = express.Router();
const { signup, login, changePassword, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Brute-force protection for credential endpoints: AUTH_RATE_LIMIT_MAX
// requests (default 20) per 15 minutes per client IP. Disabled under tests.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many attempts, please try again later.' },
});

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.put('/change-password', protect, changePassword);
router.get('/profile', protect, getProfile);

module.exports = router;
