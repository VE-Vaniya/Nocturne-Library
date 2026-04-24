const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  genre: { type: String },
  status: { 
    type: String, 
    enum: ['currently reading', 'completed', 'wishlist', 'dropped'],
    default: 'wishlist'
  },
  progress: { type: String }, // e.g., "351 / 551"
  coverImage: { type: String }, // URL or Binary data for the book cover
  lastRead: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Book', bookSchema);
