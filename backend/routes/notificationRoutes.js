const express = require('express');
const router = express.Router();
const { getNotifications, markRead, markAllRead, respondToRequest } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', getNotifications);
// read-all must be registered before /:id
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);
router.put('/:id', respondToRequest);

module.exports = router;
