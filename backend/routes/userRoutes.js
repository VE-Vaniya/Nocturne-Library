const express = require('express');
const router = express.Router();
const { getUsers, sendConnectionRequest } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getUsers);
router.get('/requests/sent', protect, require('../controllers/userController').getOutgoingRequests);
router.post('/connect/:id', protect, sendConnectionRequest);
router.delete('/connect/:id', protect, require('../controllers/userController').cancelConnectionRequest);
router.delete('/disconnect/:id', protect, require('../controllers/userController').removeConnection);

module.exports = router;
