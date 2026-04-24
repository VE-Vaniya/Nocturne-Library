const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get user notifications
// @route   GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user._id })
      .populate('senderId', 'username fullName avatar')
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Respond to connection request
// @route   PUT /api/notifications/:id
const respondToRequest = async (req, res) => {
  const { status } = req.body; // 'accepted' or 'rejected'

  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (status === 'accepted') {
      notification.status = status;
      await notification.save();
      // Add to each other's connections (using $addToSet to avoid duplicates)
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { connections: notification.senderId } });
      await User.findByIdAndUpdate(notification.senderId, { $addToSet: { connections: req.user._id } });
      res.json({ message: `Request ${status}` });
    } else {
      await Notification.findByIdAndDelete(req.params.id);
      res.json({ message: 'Request rejected and removed.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getNotifications, respondToRequest };
