const express = require('express');
const router = express.Router();
const { shareQuote } = require('../controllers/quoteController');
const { protect } = require('../middleware/authMiddleware');

router.post('/share', protect, shareQuote);

module.exports = router;
