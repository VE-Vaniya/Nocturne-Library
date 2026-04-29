const express = require('express');
const router = express.Router();
const { getMissives } = require('../controllers/missiveController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getMissives);

module.exports = router;
