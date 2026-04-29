const express = require('express');
const router = express.Router();
const { getUsers, sendConnectionRequest, getOutgoingRequests, cancelConnectionRequest, removeConnection, updateAvatar, updateReadingStats } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getUsers);
router.get('/requests/sent', protect, getOutgoingRequests);
router.post('/connect/:id', protect, sendConnectionRequest);
router.put('/avatar', protect, updateAvatar);
router.put('/reading-stats', protect, updateReadingStats);
router.delete('/connect/:id', protect, cancelConnectionRequest);
router.delete('/disconnect/:id', protect, removeConnection);

module.exports = router;
