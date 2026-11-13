const mongoose = require('mongoose');
const { sendNotificationEmail } = require('../services/emailService');

const isObjectId = (value) =>
  typeof value === 'string' && mongoose.isValidObjectId(value) && /^[a-f\d]{24}$/i.test(value);

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Public fields of another user. Never includes email or password.
const PUBLIC_USER_FIELDS = '_id username fullName avatar';

const toPublicUser = (u) =>
  u
    ? {
        _id: String(u._id),
        username: u.username,
        fullName: u.fullName,
        avatar: u.avatar || '',
      }
    : null;

// Send an email without delaying or failing the request.
const sendEmailInBackground = (to, subject, text, html) => {
  if (!to) return;
  Promise.resolve()
    .then(() => sendNotificationEmail(to, subject, text, html))
    .catch((err) => {
      if (process.env.NODE_ENV !== 'test') console.error('Email failed:', err.message);
    });
};

const isFriend = (user, otherId) =>
  (user.connections || []).some((c) => String(c._id || c) === String(otherId));

module.exports = {
  isObjectId,
  escapeRegex,
  PUBLIC_USER_FIELDS,
  toPublicUser,
  sendEmailInBackground,
  isFriend,
};
