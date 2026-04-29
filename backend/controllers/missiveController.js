const Missive = require('../models/Missive');

// @desc    Get all received missives
// @route   GET /api/missives
const getMissives = async (req, res) => {
  try {
    const missives = await Missive.find({ recipientId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(missives);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMissives };
