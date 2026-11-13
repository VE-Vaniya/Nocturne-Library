const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  author: { type: String },
  bookTitle: { type: String },
  page: { type: String }, // free-form: "p. 47", "Book I", ...
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
  sharedWith: { type: Array, default: [] }, // List of user IDs or 'none'
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Quote', quoteSchema);
