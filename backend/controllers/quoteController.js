const Quote = require('../models/Quote');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Missive = require('../models/Missive');
const { sendNotificationEmail } = require('../services/emailService');
const escapeHtml = require('../utils/escapeHtml');

// @desc    Share a quote with another user
// @route   POST /api/quotes/share
const shareQuote = async (req, res) => {
  const { quoteId, recipientId, text, author, bookTitle } = req.body;
  const senderId = req.user._id;

  try {
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Create a notification for the shared quote
    await Notification.create({
      recipientId,
      senderId,
      type: 'quote_shared',
      message: `${req.user.fullName} shared a quote with you.`
    });

    // Create a Missive record (the actual shared quote)
    await Missive.create({
      recipientId,
      senderId,
      senderName: req.user.fullName,
      text,
      author,
      bookTitle
    });

    // Send Email Notification
    if (recipient.email) {
      await sendNotificationEmail(
        recipient.email,
        'New Shared Quote - Nocturne Library',
        `${req.user.fullName} (${req.user.email}) has sent you a quote on Nocturne library`,
        `<div style="font-family: 'Playfair Display', serif; padding: 20px; background-color: #f4f1ea; border: 1px solid #d1c5a9;">
          <h2 style="color: #4a3e35;">New Quote Shared</h2>
          <p style="font-size: 16px; color: #5a4d41;">
            <b>${escapeHtml(req.user.fullName)}</b> (${escapeHtml(req.user.email)}) has sent you a request on Nocturne library (shared a quote).
          </p>
          <blockquote style="font-style: italic; border-left: 4px solid #c4a572; padding-left: 15px; margin: 20px 0; color: #5a4d41;">
            "${escapeHtml(text)}"
          </blockquote>
          <p style="text-align: right; color: #796e62;">— ${escapeHtml(author || 'Unknown')}, <i>${escapeHtml(bookTitle || 'Untitled')}</i></p>
          <p style="font-size: 14px; color: #796e62; font-style: italic; margin-top: 30px;">
            Log in to Nocturne library to see your collected missives.
          </p>
        </div>`
      );
    }

    res.status(200).json({ message: 'Quote shared successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all personal quotes
// @route   GET /api/quotes
const getQuotes = async (req, res) => {
  try {
    const quotes = await Quote.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(quotes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a personal quote
// @route   POST /api/quotes
const addQuote = async (req, res) => {
  const { text, author, bookTitle } = req.body;
  try {
    const quote = await Quote.create({
      ownerId: req.user._id,
      text,
      author,
      bookTitle
    });
    res.status(201).json(quote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a quote
// @route   DELETE /api/quotes/:id
const deleteQuote = async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }
    if (quote.ownerId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Quote not found' });
    }
    await quote.deleteOne();
    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { shareQuote, getQuotes, addQuote, deleteQuote };
