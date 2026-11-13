const mongoose = require('mongoose');

const SEAL_COLORS = ['oxblood', 'green', 'midnight', 'plum'];

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }, // bcrypt hash
  avatar: { type: String, default: '' }, // data URL or https URL
  bio: { type: String, default: '', maxlength: 140 },
  sealColor: { type: String, enum: SEAL_COLORS, default: 'oxblood' },
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  // Total reading time in seconds
  readingTime: { type: Number, default: 0 },
  pagesReadToday: { type: Number, default: 0 },
  // Reading streak: consecutive UTC calendar days with >= 1 reading session,
  // ending on lastReadDate (see utils/streak.js).
  lastReadDate: { type: Date },
  streak: { type: Number, default: 0 },
});

module.exports = mongoose.model('User', userSchema);
module.exports.SEAL_COLORS = SEAL_COLORS;
