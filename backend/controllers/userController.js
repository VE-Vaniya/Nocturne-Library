const mongoose = require('mongoose');
const User = require('../models/User');
const Book = require('../models/Book');
const Quote = require('../models/Quote');
const Notification = require('../models/Notification');
const { SEAL_COLORS } = require('../models/User');
const {
  isObjectId,
  escapeRegex,
  PUBLIC_USER_FIELDS,
  toPublicUser,
  sendEmailInBackground,
  isFriend,
} = require('../utils/helpers');
const { USERNAME_RE, avatarError } = require('../utils/validators');
const { nextStreak, effectiveStreak, utcDay } = require('../utils/streak');
const { renderEmail } = require('../services/emailTemplates');

const MAX_SUGGESTIONS = 12;
const MAX_SEARCH_RESULTS = 20;
const MAX_SESSION_SECONDS = 24 * 60 * 60;

const normTitle = (t) => String(t || '').trim().toLowerCase();

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// Map userId -> title of their most recently read 'currently reading' book.
const currentlyReadingFor = async (userIds) => {
  if (!userIds.length) return new Map();
  const books = await Book.find({ userId: { $in: userIds }, status: 'currently reading' })
    .select('userId title lastRead')
    .sort({ lastRead: -1 })
    .lean();
  const map = new Map();
  for (const b of books) {
    const key = String(b.userId);
    if (!map.has(key)) map.set(key, b.title);
  }
  return map;
};

// Map userId -> number of distinct (lowercased) titles shared with `myTitles`.
const booksInCommonFor = async (userIds, myTitles) => {
  if (!userIds.length || !myTitles.length) return new Map();
  const rows = await Book.aggregate([
    { $match: { userId: { $in: userIds } } },
    { $project: { userId: 1, t: { $toLower: { $trim: { input: '$title' } } } } },
    { $match: { t: { $in: myTitles } } },
    { $group: { _id: '$userId', titles: { $addToSet: '$t' } } },
    { $project: { count: { $size: '$titles' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
};

const myLowercasedTitles = async (userId) => {
  const books = await Book.find({ userId }).select('title').lean();
  return [...new Set(books.map((b) => normTitle(b.title)).filter(Boolean))];
};

// Map userId -> 'sent' | 'incoming' for pending connection requests.
const requestStatusFor = async (meId, userIds) => {
  if (!userIds.length) return new Map();
  const pending = await Notification.find({
    type: 'connection_request',
    status: 'pending',
    $or: [
      { senderId: meId, recipientId: { $in: userIds } },
      { recipientId: meId, senderId: { $in: userIds } },
    ],
  }).select('senderId recipientId').lean();
  const map = new Map();
  for (const n of pending) {
    if (String(n.senderId) === String(meId)) map.set(String(n.recipientId), 'sent');
    else if (!map.has(String(n.senderId))) map.set(String(n.senderId), 'incoming');
  }
  return map;
};

// Shape a list of users as people cards (suggestions / search).
const toPeopleCards = async (me, users, commonMap) => {
  const ids = users.map((u) => u._id);
  const [reading, requests] = await Promise.all([
    currentlyReadingFor(ids),
    requestStatusFor(me._id, ids),
  ]);
  return users.map((u) => ({
    ...toPublicUser(u),
    booksInCommon: commonMap.get(String(u._id)) || 0,
    currentlyReading: reading.get(String(u._id)) || null,
    requestStatus: requests.get(String(u._id)) || 'none',
  }));
};

const excludedIds = (me) => [me._id, ...(me.connections || [])];

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

// @desc    Update own profile
// @route   PUT /api/users/me
const updateMe = async (req, res) => {
  const body = req.body || {};
  const updates = {};

  if (body.fullName !== undefined) {
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    if (!fullName || fullName.length > 80) {
      return res.status(400).json({ message: 'Full name must be 1-80 characters' });
    }
    updates.fullName = fullName;
  }

  if (body.username !== undefined) {
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ message: 'Username must be 3-30 characters: lowercase letters, digits, _ or .' });
    }
    const taken = await User.exists({
      _id: { $ne: req.user._id },
      username: new RegExp(`^${escapeRegex(username)}$`, 'i'),
    });
    if (taken) return res.status(400).json({ message: 'That username is already taken.' });
    updates.username = username;
  }

  if (body.bio !== undefined) {
    if (typeof body.bio !== 'string' || body.bio.trim().length > 140) {
      return res.status(400).json({ message: 'Bio must be at most 140 characters' });
    }
    updates.bio = body.bio.trim();
  }

  if (body.avatar !== undefined) {
    const err = avatarError(body.avatar);
    if (err) return res.status(400).json({ message: err });
    updates.avatar = body.avatar;
  }

  if (body.sealColor !== undefined) {
    if (!SEAL_COLORS.includes(body.sealColor)) {
      return res.status(400).json({ message: `sealColor must be one of ${SEAL_COLORS.join(', ')}` });
    }
    updates.sealColor = body.sealColor;
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user);
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(400).json({ message: 'That username is already taken.' });
    }
    throw error;
  }
};

// @desc    Update user avatar (legacy; prefer PUT /api/users/me)
// @route   PUT /api/users/avatar
const updateAvatar = async (req, res) => {
  const { avatar } = req.body || {};
  const err = avatarError(avatar);
  if (err) return res.status(400).json({ message: err });
  await User.updateOne({ _id: req.user._id }, { $set: { avatar } });
  return res.json({ message: 'Avatar updated successfully', avatar });
};

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

// @desc    Reading stats for the dashboard
// @route   GET /api/users/stats
const getStats = async (req, res) => {
  const me = req.user;
  const [books, quotes] = await Promise.all([
    Book.countDocuments({ userId: me._id }),
    Quote.countDocuments({ ownerId: me._id }),
  ]);
  res.json({
    streak: effectiveStreak(me.lastReadDate, me.streak),
    readingTimeSeconds: me.readingTime || 0,
    books,
    quotes,
    friends: (me.connections || []).length,
  });
};

// @desc    Log a reading session
// @route   PUT /api/users/reading-stats
// A session with elapsedSeconds > 0 or pagesRead > 0 counts towards the
// streak (UTC calendar days, see utils/streak.js).
const updateReadingStats = async (req, res) => {
  const { elapsedSeconds, pagesRead, bookId, lastPageRead } = req.body || {};

  if (typeof elapsedSeconds !== 'number' || !Number.isFinite(elapsedSeconds)
    || elapsedSeconds < 0 || elapsedSeconds > MAX_SESSION_SECONDS) {
    return res.status(400).json({ message: `elapsedSeconds must be a number between 0 and ${MAX_SESSION_SECONDS}` });
  }
  if (pagesRead !== undefined && pagesRead !== null
    && (typeof pagesRead !== 'number' || !Number.isFinite(pagesRead) || pagesRead < 0)) {
    return res.status(400).json({ message: 'pagesRead must be a non-negative number' });
  }
  if (lastPageRead !== undefined && lastPageRead !== null
    && (typeof lastPageRead !== 'number' || !Number.isFinite(lastPageRead) || lastPageRead < 0)) {
    return res.status(400).json({ message: 'lastPageRead must be a non-negative number' });
  }

  const now = new Date();

  if (bookId !== undefined && bookId !== null && bookId !== '') {
    if (!isObjectId(bookId)) return res.status(404).json({ message: 'Book not found' });
    const bookUpdate = { lastRead: now };
    if (typeof lastPageRead === 'number') bookUpdate.lastPageRead = Math.floor(lastPageRead);
    const book = await Book.findOneAndUpdate(
      { _id: bookId, userId: req.user._id },
      { $set: bookUpdate }
    );
    if (!book) return res.status(404).json({ message: 'Book not found' });
  }

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const seconds = Math.round(elapsedSeconds);
  const pages = typeof pagesRead === 'number' ? Math.floor(pagesRead) : 0;
  const sameDay = user.lastReadDate && utcDay(user.lastReadDate) === utcDay(now);

  user.readingTime = (user.readingTime || 0) + seconds;
  if (seconds > 0 || pages > 0) {
    user.pagesReadToday = sameDay ? (user.pagesReadToday || 0) + pages : pages;
    user.streak = nextStreak(user.lastReadDate, user.streak, now);
    user.lastReadDate = now;
  }
  await user.save();

  return res.json({
    streak: effectiveStreak(user.lastReadDate, user.streak, now),
    readingTimeSeconds: user.readingTime,
  });
};

// ---------------------------------------------------------------------------
// Friends & people
// ---------------------------------------------------------------------------

// @desc    Get all users for explore page (legacy)
// @route   GET /api/users
const getUsers = async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } }).select(PUBLIC_USER_FIELDS).lean();
  res.json(users.map(toPublicUser));
};

// @desc    List friends with what they are reading
// @route   GET /api/users/friends
const getFriends = async (req, res) => {
  const ids = req.user.connections || [];
  const friends = await User.find({ _id: { $in: ids } })
    .select(PUBLIC_USER_FIELDS)
    .sort({ fullName: 1 })
    .lean();
  const reading = await currentlyReadingFor(friends.map((f) => f._id));
  res.json(friends.map((f) => ({
    ...toPublicUser(f),
    currentlyReading: reading.get(String(f._id)) || null,
  })));
};

// @desc    People you may know, ranked by books in common
// @route   GET /api/users/suggestions
const getSuggestions = async (req, res) => {
  const me = req.user;
  const exclude = excludedIds(me);
  const myTitles = await myLowercasedTitles(me._id);

  let ranked = [];
  if (myTitles.length) {
    ranked = await Book.aggregate([
      { $match: { userId: { $nin: exclude } } },
      { $project: { userId: 1, t: { $toLower: { $trim: { input: '$title' } } } } },
      { $match: { t: { $in: myTitles } } },
      { $group: { _id: '$userId', titles: { $addToSet: '$t' } } },
      { $project: { count: { $size: '$titles' } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: MAX_SUGGESTIONS },
    ]);
  }
  const commonMap = new Map(ranked.map((r) => [String(r._id), r.count]));

  const rankedUsers = ranked.length
    ? await User.find({ _id: { $in: ranked.map((r) => r._id) } }).select(PUBLIC_USER_FIELDS).lean()
    : [];
  // Some ranked ids may belong to deleted users; keep ranking order.
  const byId = new Map(rankedUsers.map((u) => [String(u._id), u]));
  const users = ranked.map((r) => byId.get(String(r._id))).filter(Boolean);

  // Top up with other readers (newest first) when there are not enough matches.
  if (users.length < MAX_SUGGESTIONS) {
    const more = await User.find({ _id: { $nin: [...exclude, ...users.map((u) => u._id)] } })
      .select(PUBLIC_USER_FIELDS)
      .sort({ createdAt: -1 })
      .limit(MAX_SUGGESTIONS - users.length)
      .lean();
    users.push(...more);
  }

  res.json(await toPeopleCards(me, users, commonMap));
};

// @desc    Search readers by name or username (excludes self and friends)
// @route   GET /api/users/search?q=
const searchUsers = async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) return res.json([]);
  if (q.length > 64) return res.status(400).json({ message: 'Search query is too long' });

  const re = new RegExp(escapeRegex(q), 'i');
  const users = await User.find({
    _id: { $nin: excludedIds(req.user) },
    $or: [{ fullName: re }, { username: re }],
  })
    .select(PUBLIC_USER_FIELDS)
    .sort({ fullName: 1 })
    .limit(MAX_SEARCH_RESULTS)
    .lean();

  const myTitles = await myLowercasedTitles(req.user._id);
  const commonMap = await booksInCommonFor(users.map((u) => u._id), myTitles);
  const cards = await toPeopleCards(req.user, users, commonMap);
  cards.sort((a, b) => b.booksInCommon - a.booksInCommon);
  res.json(cards);
};

// @desc    Send connection request
// @route   POST /api/users/connect/:id
const sendConnectionRequest = async (req, res) => {
  const targetId = req.params.id;
  const me = req.user;

  if (!isObjectId(targetId)) return res.status(400).json({ message: 'Invalid user id' });
  if (String(targetId) === String(me._id)) {
    return res.status(400).json({ message: 'You cannot send a request to yourself' });
  }
  if (isFriend(me, targetId)) {
    return res.status(400).json({ message: 'You are already friends' });
  }

  const target = await User.findById(targetId).select('email fullName');
  if (!target) return res.status(404).json({ message: 'User not found' });

  const existing = await Notification.findOne({
    type: 'connection_request',
    status: 'pending',
    $or: [
      { senderId: me._id, recipientId: targetId },
      { senderId: targetId, recipientId: me._id },
    ],
  }).lean();
  if (existing) {
    const message = String(existing.senderId) === String(me._id)
      ? 'Request already pending'
      : 'This reader has already sent you a request';
    return res.status(400).json({ message });
  }

  await Notification.create({
    recipientId: targetId,
    senderId: me._id,
    type: 'connection_request',
    status: 'pending',
    message: `${me.fullName} sent you a connection request.`,
  });

  sendEmailInBackground(
    target.email,
    'New Connection Request - Nocturne Library',
    `${me.fullName} (@${me.username}) has sent you a friend request on Nocturne Library.`,
    renderEmail({
      heading: 'New Connection Request',
      paragraphs: [`${me.fullName} (@${me.username}) has sent you a friend request on Nocturne Library.`],
      footer: 'Log in to your sanctuary to respond.',
    })
  );

  return res.status(201).json({ message: 'Connection request sent' });
};

// @desc    Get outgoing connection requests
// @route   GET /api/users/requests/sent
const getOutgoingRequests = async (req, res) => {
  const requests = await Notification.find({
    senderId: req.user._id,
    type: 'connection_request',
    status: 'pending',
  }).populate('recipientId', PUBLIC_USER_FIELDS);
  res.json(requests);
};

// @desc    Cancel a pending connection request I sent
// @route   DELETE /api/users/connect/:id
const cancelConnectionRequest = async (req, res) => {
  const targetId = req.params.id;
  if (!isObjectId(targetId)) return res.status(400).json({ message: 'Invalid user id' });

  const result = await Notification.deleteMany({
    senderId: req.user._id,
    recipientId: new mongoose.Types.ObjectId(targetId),
    type: 'connection_request',
    status: 'pending',
  });

  res.json({ success: true, cancelled: result.deletedCount, message: 'Connection request cancelled' });
};

// @desc    Remove a connection
// @route   DELETE /api/users/disconnect/:id
const removeConnection = async (req, res) => {
  const targetId = req.params.id;
  if (!isObjectId(targetId)) return res.status(400).json({ message: 'Invalid user id' });
  const userId = req.user._id;

  await User.updateOne({ _id: userId }, { $pull: { connections: targetId } });
  await User.updateOne({ _id: targetId }, { $pull: { connections: userId } });

  // Wipe any requests between them so they can reconnect later
  await Notification.deleteMany({
    $or: [
      { recipientId: targetId, senderId: userId },
      { recipientId: userId, senderId: targetId },
    ],
    type: 'connection_request',
  });

  res.json({ success: true, message: 'Connection severed' });
};

module.exports = {
  updateMe,
  updateAvatar,
  getStats,
  updateReadingStats,
  getUsers,
  getFriends,
  getSuggestions,
  searchUsers,
  sendConnectionRequest,
  getOutgoingRequests,
  cancelConnectionRequest,
  removeConnection,
};
