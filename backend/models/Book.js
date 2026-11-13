const mongoose = require('mongoose');

const BOOK_STATUSES = ['currently reading', 'completed', 'wishlist', 'dropped'];

const bookSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  genre: { type: String },
  status: {
    type: String,
    enum: BOOK_STATUSES,
    default: 'wishlist'
  },
  progress: { type: String }, // e.g., "351 / 551"
  coverImage: { type: String }, // data URL or URL for the book cover
  totalPages: { type: Number, min: 0 },
  lastRead: { type: Date, default: Date.now },
  moodTags: [{ type: String }],
  lastPageRead: { type: Number, default: 0, min: 0 }
});

module.exports = mongoose.model('Book', bookSchema);
module.exports.BOOK_STATUSES = BOOK_STATUSES;
