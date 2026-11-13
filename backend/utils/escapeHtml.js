// Escape user-supplied text before interpolating it into HTML (e.g. emails).
const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

module.exports = escapeHtml;
