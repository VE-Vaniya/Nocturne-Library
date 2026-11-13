const express = require('express');
const router = express.Router();
const {
  updateMe,
  updateAvatar,
  getStats,
  updateReadingStats,
  getUsers,
  getFriends,
  getSuggestions,
  searchUsers,
  sendConnectionRequest,
  getOutgoingRequests,
  cancelConnectionRequest,
  removeConnection,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getUsers);
router.put('/me', updateMe);
router.get('/stats', getStats);
router.put('/reading-stats', updateReadingStats);
router.get('/friends', getFriends);
router.get('/suggestions', getSuggestions);
router.get('/search', searchUsers);
router.get('/requests/sent', getOutgoingRequests);
router.put('/avatar', updateAvatar);
router.post('/connect/:id', sendConnectionRequest);
router.delete('/connect/:id', cancelConnectionRequest);
router.delete('/disconnect/:id', removeConnection);

module.exports = router;
