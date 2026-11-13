const escapeHtml = require('../utils/escapeHtml');

// Minimal parchment-styled wrapper. `paragraphs` are plain strings and are
// escaped here; `quote` (optional) is rendered as a blockquote.
const renderEmail = ({ heading, paragraphs = [], quote, attribution, footer }) => {
  const ps = paragraphs
    .map((p) => `<p style="font-size: 16px; color: #5a4d41;">${escapeHtml(p)}</p>`)
    .join('');
  const q = quote
    ? `<blockquote style="font-style: italic; border-left: 4px solid #c4a572; padding-left: 15px; margin: 20px 0; color: #5a4d41;">"${escapeHtml(quote)}"</blockquote>`
    : '';
  const a = attribution
    ? `<p style="text-align: right; color: #796e62;">— ${escapeHtml(attribution)}</p>`
    : '';
  const f = footer
    ? `<p style="font-size: 14px; color: #796e62; font-style: italic; margin-top: 30px;">${escapeHtml(footer)}</p>`
    : '';
  return `<div style="font-family: 'Playfair Display', serif; padding: 20px; background-color: #f4f1ea; border: 1px solid #d1c5a9;"><h2 style="color: #4a3e35;">${escapeHtml(heading)}</h2>${ps}${q}${a}${f}</div>`;
};

module.exports = { renderEmail };
