const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true }, // To be hashed with bcrypt
  avatar: { type: String }, // URL to profile image
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  readingTime: { type: Number, default: 0 },
  pagesReadToday: { type: Number, default: 0 },
  lastReadDate: { type: Date }
});

module.exports = mongoose.model('User', userSchema);
