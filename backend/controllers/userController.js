const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const { sendNotificationEmail } = require('../services/emailService');

// @desc    Get all users for explore page
// @route   GET /api/users
const getUsers = async (req, res) => {
  try {
    // Exclude the current user from the list
    const users = await User.find({ _id: { $ne: req.user._id } }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send connection request
// @route   POST /api/users/connect/:id
const sendConnectionRequest = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const senderId = req.user._id;

    // Check if request already exists
    const existingNotification = await Notification.findOne({
      recipientId: targetUserId,
      senderId: senderId,
      type: 'connection_request',
      status: 'pending'
    });

    if (existingNotification) {
      return res.status(400).json({ message: 'Request already pending' });
    }

    await Notification.create({
      recipientId: targetUserId,
      senderId: senderId,
      type: 'connection_request',
      message: `${req.user.fullName} sent you a connection request.`
    });

    // Send Email Notification
    const recipient = await User.findById(targetUserId);
    if (recipient && recipient.email) {
      await sendNotificationEmail(
        recipient.email,
        'New Connection Request - Nocturne Library',
        `${req.user.fullName} (${req.user.email}) has sent you a request on Nocturne library`,
        `<div style="font-family: 'Playfair Display', serif; padding: 20px; background-color: #f4f1ea; border: 1px solid #d1c5a9;">
          <h2 style="color: #4a3e35;">New Connection Request</h2>
          <p style="font-size: 16px; color: #5a4d41;">
            <b>${req.user.fullName}</b> (${req.user.email}) has sent you a request on Nocturne library.
          </p>
          <p style="font-size: 14px; color: #796e62; font-style: italic;">
            Log in to your sanctuary to respond.
          </p>
        </div>`
      );
    }

    res.status(201).json({ message: 'Connection request sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get outgoing connection requests
// @route   GET /api/users/requests/sent
const getOutgoingRequests = async (req, res) => {
  try {
    const requests = await Notification.find({ 
      senderId: req.user._id, 
      type: 'connection_request' 
    }).populate('recipientId', 'username fullName email avatar');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel connection request
// @route   DELETE /api/users/connect/:id
const cancelConnectionRequest = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const senderId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ message: 'Invalid target user ID' });
    }

    const targetId = new mongoose.Types.ObjectId(targetUserId);

    // Remove any pending OR accepted notifications between these two
    await Notification.deleteMany({
      $or: [
        { recipientId: targetId, senderId: senderId },
        { recipientId: senderId, senderId: targetId }
      ],
      type: 'connection_request'
    });

    res.json({ success: true, message: 'Connection request cancelled' });
  } catch (error) {
    console.error("Cancel Error:", error);
    res.json({ success: true, message: 'Already cancelled or removed' });
  }
};

// @desc    Remove a connection
// @route   DELETE /api/users/disconnect/:id
const removeConnection = async (req, res) => {
  try {
    const targetId = req.params.id;
    const userId = req.user._id;

    // Use direct updateOne for maximum reliability
    await User.updateOne({ _id: userId }, { $pull: { connections: targetId } });
    await User.updateOne({ _id: targetId }, { $pull: { connections: userId } });

    // Wipe any existing notifications/requests between them
    await Notification.deleteMany({
      $or: [
        { recipientId: targetId, senderId: userId },
        { recipientId: userId, senderId: targetId }
      ],
      type: 'connection_request'
    });

    res.json({ success: true, message: 'Connection severed' });
  } catch (error) {
    console.error("Critical Disconnect Error:", error);
    res.status(500).json({ message: "Database failed to sever connection." });
  }
};

// @desc    Update user avatar
// @route   PUT /api/users/avatar
const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;
    
    // Use findById and save to ensure all hooks and simple logic work
    const user = await User.findById(req.user._id);
    
    if (user) {
      user.avatar = avatar;
      await user.save();
      res.json({ message: 'Avatar updated successfully', avatar: user.avatar });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error("Avatar Update Error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUsers, sendConnectionRequest, getOutgoingRequests, cancelConnectionRequest, removeConnection, updateAvatar };
