const express = require('express');
const router = express.Router();
const { searchExternalBooks } = require('../controllers/searchController');
const { protect } = require('../middleware/authMiddleware');

// Route is /api/search
router.get('/', protect, searchExternalBooks);

module.exports = router;
