const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendNotificationEmail } = require('../services/emailService');

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

      // Send Email Notification to the original sender
      const originalSender = await User.findById(notification.senderId);
      if (originalSender && originalSender.email) {
        await sendNotificationEmail(
          originalSender.email,
          'Connection Request Accepted - Nocturne Library',
          `${req.user.fullName} (${req.user.email}) has accepted your connection request on Nocturne library`,
          `<div style="font-family: 'Playfair Display', serif; padding: 20px; background-color: #f4f1ea; border: 1px solid #d1c5a9;">
            <h2 style="color: #4a3e35;">Connection Request Accepted</h2>
            <p style="font-size: 16px; color: #5a4d41;">
              <b>${req.user.fullName}</b> (${req.user.email}) has accepted your connection request on Nocturne library.
            </p>
            <p style="font-size: 14px; color: #796e62; font-style: italic;">
              You are now connected in the sanctuary.
            </p>
          </div>`
        );
      }

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
