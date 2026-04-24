const express = require('express');
const router = express.Router();
const { signup, login, changePassword, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.put('/change-password', protect, changePassword);
router.get('/profile', protect, getProfile);

module.exports = router;
