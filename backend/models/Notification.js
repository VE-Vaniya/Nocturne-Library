const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'connection_request',
  'quote_shared',
  'letter',
  'request_accepted',
  'system_alert',
];

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: NOTIFICATION_TYPES,
    required: true,
  },
  // Only meaningful for connection_request; null for everything else.
  // 'seen' is a legacy value kept so old documents still validate.
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'seen', null], default: null },
  read: { type: Boolean, default: false },
  missiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Missive', default: null },
  message: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
