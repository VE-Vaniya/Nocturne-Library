const express = require('express');
const router = express.Router();
const { getNotifications, respondToRequest } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getNotifications);
router.put('/:id', protect, respondToRequest);

module.exports = router;
