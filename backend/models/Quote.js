const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  author: { type: String },
  bookTitle: { type: String },
  sharedWith: { type: Array, default: [] }, // List of user IDs or 'none'
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quote', quoteSchema);
