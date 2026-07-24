const express = require('express');
const router = express.Router();
const { searchExternalBooks } = require('../controllers/searchController');

// Route is /api/search
router.get('/', searchExternalBooks);

module.exports = router;
