const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { escapeRegex } = require('../utils/helpers');
const { USERNAME_RE } = require('../utils/validators');

const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const authResponse = (user) => ({
  _id: String(user._id),
  username: user.username,
  fullName: user.fullName,
  email: user.email,
  avatar: user.avatar || '',
  bio: user.bio || '',
  token: generateToken(user._id),
});

const str = (v) => (typeof v === 'string' ? v.trim() : '');

// @desc    Register new user
// @route   POST /api/auth/signup
const signup = async (req, res) => {
  const body = req.body || {};
  const fullName = str(body.fullName);
  const username = str(body.username).toLowerCase();
  const email = str(body.email).toLowerCase();
  const { password } = body;

  if (!fullName || !username || !email || typeof password !== 'string') {
    return res.status(400).json({ message: 'fullName, username, email and password are required' });
  }
  if (fullName.length > 80) {
    return res.status(400).json({ message: 'Full name must be at most 80 characters' });
  }
  if (!USERNAME_RE.test(username)) {
    return res
      .status(400)
      .json({ message: 'Username must be 3-30 characters: lowercase letters, digits, _ or .' });
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    return res
      .status(400)
      .json({ message: `Password must be ${MIN_PASSWORD}-${MAX_PASSWORD} characters` });
  }

  if (await User.exists({ email })) {
    return res.status(400).json({ message: 'An account with that email already exists.' });
  }
  if (await User.exists({ username: new RegExp(`^${escapeRegex(username)}$`, 'i') })) {
    return res.status(400).json({ message: 'That username is already taken.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, fullName, email, password: hashedPassword });
    return res.status(201).json(authResponse(user));
  } catch (error) {
    // Unique index violation (race between the checks above and the insert)
    if (error && error.code === 11000) {
      const field = Object.keys(error.keyPattern || error.keyValue || {})[0];
      const message =
        field === 'username'
          ? 'That username is already taken.'
          : 'An account with that email already exists.';
      return res.status(400).json({ message });
    }
    throw error;
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
const login = async (req, res) => {
  const body = req.body || {};
  const email = str(body.email).toLowerCase();
  const { password } = body;

  if (!email || typeof password !== 'string' || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email });
  if (user && (await bcrypt.compare(password, user.password))) {
    return res.json(authResponse(user));
  }
  return res.status(401).json({ message: 'Invalid email or password' });
};

// @desc    Change password
// @route   PUT /api/auth/change-password
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ message: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < MIN_PASSWORD || newPassword.length > MAX_PASSWORD) {
    return res
      .status(400)
      .json({ message: `New password must be ${MIN_PASSWORD}-${MAX_PASSWORD} characters` });
  }

  const user = await User.findById(req.user._id);
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(401).json({ message: 'Invalid current password' });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  return res.json({ message: 'Password changed successfully' });
};

// @desc    Get user profile
// @route   GET /api/auth/profile
const getProfile = async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('-password')
    .populate('connections', 'username fullName avatar');
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json(user);
};

module.exports = { signup, login, changePassword, getProfile };
