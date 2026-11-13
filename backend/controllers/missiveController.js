const Missive = require('../models/Missive');
const Notification = require('../models/Notification');
const Quote = require('../models/Quote');
const User = require('../models/User');
const {
  isObjectId,
  PUBLIC_USER_FIELDS,
  toPublicUser,
  sendEmailInBackground,
  isFriend,
} = require('../utils/helpers');
const { renderEmail } = require('../services/emailTemplates');

const MAX_LETTER = 2000;

const serializeMissive = (m) => {
  const sender = m.senderId && typeof m.senderId === 'object' && m.senderId.username !== undefined
    ? m.senderId
    : null;
  return {
    _id: String(m._id),
    kind: m.kind || 'quote',
    senderId: String(sender ? sender._id : m.senderId),
    recipientId: String(m.recipientId),
    from: toPublicUser(sender),
    text: m.text || '',
    author: m.author || '',
    bookTitle: m.bookTitle || '',
    page: m.page || '',
    message: m.message || '',
    body: m.body || '',
    saved: Boolean(m.savedQuoteId),
    isRead: Boolean(m.isRead),
    createdAt: m.createdAt,
  };
};

// @desc    Get all received missives (shared quotes and letters)
// @route   GET /api/missives
const getMissives = async (req, res) => {
  const missives = await Missive.find({ recipientId: req.user._id })
    .populate('senderId', PUBLIC_USER_FIELDS)
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json(missives.map(serializeMissive));
};

// @desc    Send a letter to a friend
// @route   POST /api/missives
const sendLetter = async (req, res) => {
  const { recipientId, body } = req.body || {};
  const me = req.user;

  if (!isObjectId(recipientId)) return res.status(400).json({ message: 'Invalid recipient id' });
  const text = typeof body === 'string' ? body.trim() : '';
  if (!text || text.length > MAX_LETTER) {
    return res.status(400).json({ message: `Letter body must be 1-${MAX_LETTER} characters` });
  }
  if (!isFriend(me, recipientId)) {
    return res.status(403).json({ message: 'You can only write to your friends' });
  }
  const recipient = await User.findById(recipientId).select('email').lean();
  if (!recipient) return res.status(403).json({ message: 'You can only write to your friends' });

  const missive = await Missive.create({
    kind: 'letter',
    recipientId,
    senderId: me._id,
    senderName: me.fullName,
    body: text,
  });
  await Notification.create({
    recipientId,
    senderId: me._id,
    type: 'letter',
    missiveId: missive._id,
    message: `${me.fullName} sent you a letter.`,
  });

  sendEmailInBackground(
    recipient.email,
    'A Letter Has Arrived - Nocturne Library',
    `${me.fullName} (@${me.username}) has sent you a letter on Nocturne Library.`,
    renderEmail({
      heading: 'A Letter Has Arrived',
      paragraphs: [`${me.fullName} (@${me.username}) has sent you a letter on Nocturne Library.`],
      footer: 'Log in to Nocturne Library to read it.',
    })
  );

  const created = missive.toObject();
  created.senderId = { _id: me._id, username: me.username, fullName: me.fullName, avatar: me.avatar };
  return res.status(201).json(serializeMissive(created));
};

// @desc    Save a received shared quote into my quotes (idempotent)
// @route   POST /api/missives/:id/save
const saveMissive = async (req, res) => {
  const { id } = req.params;
  const notFound = () => res.status(404).json({ message: 'Missive not found' });
  if (!isObjectId(id)) return notFound();

  const missive = await Missive.findOne({ _id: id, recipientId: req.user._id, kind: { $ne: 'letter' } });
  if (!missive) return notFound();

  if (missive.savedQuoteId) {
    const existing = await Quote.findOne({ _id: missive.savedQuoteId, ownerId: req.user._id });
    if (existing) return res.status(200).json(existing);
  }

  const quote = await Quote.create({
    ownerId: req.user._id,
    text: missive.text,
    author: missive.author,
    bookTitle: missive.bookTitle,
    page: missive.page,
  });

  // Claim the missive atomically; if a concurrent request won the race,
  // drop our copy and return theirs.
  const claimed = await Missive.findOneAndUpdate(
    { _id: missive._id, savedQuoteId: missive.savedQuoteId || null },
    { $set: { savedQuoteId: quote._id } },
    { returnDocument: 'after' }
  );
  if (!claimed) {
    await Quote.deleteOne({ _id: quote._id });
    const fresh = await Missive.findById(missive._id).lean();
    const winner = fresh && fresh.savedQuoteId
      ? await Quote.findOne({ _id: fresh.savedQuoteId, ownerId: req.user._id })
      : null;
    if (winner) return res.status(200).json(winner);
    return notFound();
  }

  return res.status(201).json(quote);
};

module.exports = { getMissives, sendLetter, saveMissive, serializeMissive };
