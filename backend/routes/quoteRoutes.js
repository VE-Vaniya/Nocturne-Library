const express = require('express');
const router = express.Router();
const { shareQuote, getQuotes, addQuote, deleteQuote } = require('../controllers/quoteController');
const { protect } = require('../middleware/authMiddleware');

router.post('/share', protect, shareQuote);
router.route('/').get(protect, getQuotes).post(protect, addQuote);
router.route('/:id').delete(protect, deleteQuote);

module.exports = router;
