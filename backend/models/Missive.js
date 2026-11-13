const mongoose = require('mongoose');

// A missive is something one reader sends another: a shared quote
// (kind 'quote') or a short letter (kind 'letter').
const missiveSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String },
  kind: { type: String, enum: ['quote', 'letter'], default: 'quote' },
  // Quote fields (kind 'quote')
  text: {
    type: String,
    required: function textRequired() {
      return this.kind !== 'letter';
    },
  },
  author: { type: String },
  bookTitle: { type: String },
  page: { type: String },
  message: { type: String, maxlength: 500 }, // note sent along with a quote
  // Letter body (kind 'letter')
  body: { type: String, maxlength: 2000 },
  // Set once the recipient saves a shared quote into their own collection
  savedQuoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote', default: null },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Missive', missiveSchema);
