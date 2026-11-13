const express = require('express');
const router = express.Router();
const { getMissives, sendLetter, saveMissive } = require('../controllers/missiveController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.route('/').get(getMissives).post(sendLetter);
router.post('/:id/save', saveMissive);

module.exports = router;
