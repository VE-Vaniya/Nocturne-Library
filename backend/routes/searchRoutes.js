const express = require('express');
const router = express.Router();
const { searchExternalBooks, getBookSuggestions } = require('../controllers/searchController');
const { protect } = require('../middleware/authMiddleware');

// Route is /api/search
router.use(protect);
router.get('/', searchExternalBooks);
router.get('/suggestions', getBookSuggestions);

module.exports = router;
