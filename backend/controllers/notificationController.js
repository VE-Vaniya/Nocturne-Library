const Notification = require('../models/Notification');
const User = require('../models/User');
const {
  isObjectId,
  PUBLIC_USER_FIELDS,
  toPublicUser,
  sendEmailInBackground,
} = require('../utils/helpers');
const { renderEmail } = require('../services/emailTemplates');

const serializeMissive = (m) => (m && typeof m === 'object' && m._id ? {
  _id: String(m._id),
  kind: m.kind || 'quote',
  text: m.text || '',
  author: m.author || '',
  bookTitle: m.bookTitle || '',
  page: m.page || '',
  message: m.message || '',
  body: m.body || '',
  saved: Boolean(m.savedQuoteId),
} : null);

const serializeNotification = (n) => ({
  _id: String(n._id),
  type: n.type,
  // Status only applies to connection requests ('seen' is legacy -> null)
  status: n.type === 'connection_request' && ['pending', 'accepted', 'rejected'].includes(n.status)
    ? n.status
    : null,
  read: Boolean(n.read),
  createdAt: n.createdAt,
  from: n.senderId && typeof n.senderId === 'object' && n.senderId.username !== undefined
    ? toPublicUser(n.senderId)
    : null,
  missive: serializeMissive(n.missiveId),
});

const populated = (query) => query
  .populate('senderId', PUBLIC_USER_FIELDS)
  .populate('missiveId', 'kind text author bookTitle page message body savedQuoteId');

// @desc    Get user notifications, newest first
// @route   GET /api/notifications
const getNotifications = async (req, res) => {
  const notifications = await populated(
    Notification.find({ recipientId: req.user._id, type: { $ne: 'system_alert' } })
      .sort({ createdAt: -1, _id: -1 })
      .limit(200)
  ).lean();
  res.json(notifications.map(serializeNotification));
};

// @desc    Mark one notification as read
// @route   PUT /api/notifications/:id/read
const markRead = async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(404).json({ message: 'Notification not found' });
  const n = await populated(Notification.findOneAndUpdate(
    { _id: req.params.id, recipientId: req.user._id },
    { $set: { read: true } },
    { returnDocument: 'after' }
  )).lean();
  if (!n) return res.status(404).json({ message: 'Notification not found' });
  return res.json(serializeNotification(n));
};

// @desc    Mark all my notifications as read
// @route   PUT /api/notifications/read-all
const markAllRead = async (req, res) => {
  const result = await Notification.updateMany(
    { recipientId: req.user._id, read: { $ne: true } },
    { $set: { read: true } }
  );
  res.json({ updated: result.modifiedCount });
};

// @desc    Respond to connection request
// @route   PUT /api/notifications/:id
const respondToRequest = async (req, res) => {
  const { status } = req.body || {};

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: "Status must be 'accepted' or 'rejected'" });
  }
  if (!isObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  // Only the recipient may respond. A notification belonging to someone else
  // is reported as "not found" so its existence is not leaked.
  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      recipientId: req.user._id,
      type: 'connection_request',
      status: 'pending',
    },
    { $set: { status, read: true } },
    { returnDocument: 'after' }
  );
  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  if (status === 'accepted') {
    const senderId = notification.senderId;
    await User.updateOne({ _id: req.user._id }, { $addToSet: { connections: senderId } });
    await User.updateOne({ _id: senderId }, { $addToSet: { connections: req.user._id } });

    await Notification.create({
      recipientId: senderId,
      senderId: req.user._id,
      type: 'request_accepted',
      message: `${req.user.fullName} accepted your connection request.`,
    });

    const originalSender = await User.findById(senderId).select('email').lean();
    if (originalSender) {
      sendEmailInBackground(
        originalSender.email,
        'Connection Request Accepted - Nocturne Library',
        `${req.user.fullName} (@${req.user.username}) has accepted your connection request on Nocturne Library.`,
        renderEmail({
          heading: 'Connection Request Accepted',
          paragraphs: [`${req.user.fullName} (@${req.user.username}) has accepted your connection request on Nocturne Library.`],
          footer: 'You are now connected in the sanctuary.',
        })
      );
    }
  }

  const fresh = await populated(Notification.findById(notification._id)).lean();
  return res.json({ message: `Request ${status}`, notification: serializeNotification(fresh) });
};

module.exports = { getNotifications, markRead, markAllRead, respondToRequest, serializeNotification };
