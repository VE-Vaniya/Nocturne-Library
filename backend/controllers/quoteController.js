const Quote = require('../models/Quote');
const User = require('../models/User');
const Book = require('../models/Book');
const Notification = require('../models/Notification');
const Missive = require('../models/Missive');
const { isObjectId, sendEmailInBackground, isFriend } = require('../utils/helpers');
const { renderEmail } = require('../services/emailTemplates');

const MAX_QUOTE = 2000;
const MAX_MESSAGE = 500;
const MAX_RECIPIENTS = 20;

const optString = (v, max = 300) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'number') return String(v);
  if (typeof v !== 'string') return null; // invalid
  return v.trim().slice(0, max);
};

// Validate the shared quote fields. Returns [error, fields].
const quoteFields = (body) => {
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) return ['Quote text is required'];
  if (text.length > MAX_QUOTE) return [`Quote text must be at most ${MAX_QUOTE} characters`];
  const author = optString(body.author);
  const bookTitle = optString(body.bookTitle);
  const page = optString(body.page, 50);
  if (author === null || bookTitle === null || page === null) {
    return ['author, bookTitle and page must be strings'];
  }
  return [null, { text, author, bookTitle, page }];
};

// @desc    Share a quote with one or more friends
// @route   POST /api/quotes/share
const shareQuote = async (req, res) => {
  const body = req.body || {};
  const me = req.user;

  let ids;
  if (Array.isArray(body.recipientIds)) ids = body.recipientIds;
  else if (body.recipientId !== undefined)
    ids = [body.recipientId]; // legacy
  else ids = [];
  ids = [...new Set(ids.map((id) => (typeof id === 'string' ? id : '')))];

  if (ids.length < 1 || ids.length > MAX_RECIPIENTS) {
    return res.status(400).json({ message: `Choose between 1 and ${MAX_RECIPIENTS} recipients` });
  }
  if (!ids.every(isObjectId)) {
    return res.status(400).json({ message: 'Invalid recipient id' });
  }

  const [err, fields] = quoteFields(body);
  if (err) return res.status(400).json({ message: err });

  let message;
  if (body.message !== undefined && body.message !== null) {
    if (typeof body.message !== 'string' || body.message.trim().length > MAX_MESSAGE) {
      return res.status(400).json({ message: `Message must be at most ${MAX_MESSAGE} characters` });
    }
    message = body.message.trim() || undefined;
  }

  if (!ids.every((id) => isFriend(me, id))) {
    return res.status(403).json({ message: 'You can only share with your friends' });
  }

  const recipients = await User.find({ _id: { $in: ids } })
    .select('email fullName')
    .lean();
  if (recipients.length !== ids.length) {
    return res.status(403).json({ message: 'You can only share with your friends' });
  }

  for (const recipient of recipients) {
    const missive = await Missive.create({
      kind: 'quote',
      recipientId: recipient._id,
      senderId: me._id,
      senderName: me.fullName,
      ...fields,
      message,
    });
    await Notification.create({
      recipientId: recipient._id,
      senderId: me._id,
      type: 'quote_shared',
      missiveId: missive._id,
      message: `${me.fullName} shared a quote with you.`,
    });

    const attribution = [fields.author || 'Unknown', fields.bookTitle].filter(Boolean).join(', ');
    sendEmailInBackground(
      recipient.email,
      'New Shared Quote - Nocturne Library',
      `${me.fullName} (@${me.username}) has sent you a quote on Nocturne Library: "${fields.text}"`,
      renderEmail({
        heading: 'New Quote Shared',
        paragraphs: [
          `${me.fullName} (@${me.username}) has sent you a quote on Nocturne Library.`,
        ].concat(message ? [message] : []),
        quote: fields.text,
        attribution,
        footer: 'Log in to Nocturne Library to see your collected missives.',
      }),
    );
  }

  return res.status(200).json({ sent: recipients.length });
};

// @desc    Get all personal quotes
// @route   GET /api/quotes
const getQuotes = async (req, res) => {
  const quotes = await Quote.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json(quotes);
};

// @desc    Add a personal quote
// @route   POST /api/quotes
const addQuote = async (req, res) => {
  const body = req.body || {};
  const [err, fields] = quoteFields(body);
  if (err) return res.status(400).json({ message: err });

  let bookId;
  if (body.bookId !== undefined && body.bookId !== null && body.bookId !== '') {
    if (
      !isObjectId(body.bookId) ||
      !(await Book.exists({ _id: body.bookId, userId: req.user._id }))
    ) {
      return res.status(400).json({ message: 'bookId must reference one of your books' });
    }
    bookId = body.bookId;
  }

  const quote = await Quote.create({ ownerId: req.user._id, ...fields, bookId });
  return res.status(201).json(quote);
};

// @desc    Delete a quote
// @route   DELETE /api/quotes/:id
const deleteQuote = async (req, res) => {
  const quote = isObjectId(req.params.id)
    ? await Quote.findOne({ _id: req.params.id, ownerId: req.user._id })
    : null;
  if (!quote) return res.status(404).json({ message: 'Quote not found' });
  await quote.deleteOne();
  return res.status(200).json({ id: req.params.id });
};

module.exports = { shareQuote, getQuotes, addQuote, deleteQuote };
