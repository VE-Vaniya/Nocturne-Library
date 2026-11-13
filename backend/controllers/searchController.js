const axios = require('axios');
const Book = require('../models/Book');

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';
const TIMEOUT_MS = 5000;
const MAX_SUGGESTIONS = 8;

// Public-domain classics used when Google Books is unavailable or the user
// has no books to derive suggestions from.
const FALLBACK_SUGGESTIONS = [
  { id: 'classic-dracula', title: 'Dracula', author: 'Bram Stoker', year: '1897' },
  { id: 'classic-frankenstein', title: 'Frankenstein', author: 'Mary Shelley', year: '1818' },
  { id: 'classic-jane-eyre', title: 'Jane Eyre', author: 'Charlotte Brontë', year: '1847' },
  { id: 'classic-wuthering-heights', title: 'Wuthering Heights', author: 'Emily Brontë', year: '1847' },
  { id: 'classic-dorian-gray', title: 'The Picture of Dorian Gray', author: 'Oscar Wilde', year: '1890' },
  { id: 'classic-carmilla', title: 'Carmilla', author: 'J. Sheridan Le Fanu', year: '1872' },
  { id: 'classic-woman-in-white', title: 'The Woman in White', author: 'Wilkie Collins', year: '1859' },
  { id: 'classic-otranto', title: 'The Castle of Otranto', author: 'Horace Walpole', year: '1764' },
].map((b) => ({ ...b, image: null, reason: 'a nocturnal classic' }));

const googleBooks = async (q, maxResults) => {
  const params = { q, maxResults, printType: 'books' };
  if (process.env.GOOGLE_BOOKS_API_KEY) params.key = process.env.GOOGLE_BOOKS_API_KEY;
  const response = await axios.get(GOOGLE_BOOKS_URL, { params, timeout: TIMEOUT_MS });
  return (response && response.data && Array.isArray(response.data.items)) ? response.data.items : [];
};

const thumbnail = (info) => {
  const url = info.imageLinks && (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail);
  return url ? url.replace(/^http:/, 'https:') : null;
};

// @desc    Search for books using Google Books API
// @route   GET /api/search?q=
// On upstream failure (timeout, quota, network) this returns 200 [] so the
// UI can simply show "no results".
const searchExternalBooks = async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) return res.status(400).json({ message: 'Search query is required' });
  if (q.length > 200) return res.status(400).json({ message: 'Search query is too long' });

  let items;
  try {
    items = await googleBooks(q, 20);
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') console.error('External Search Error:', error.message);
    return res.status(200).json([]);
  }

  const books = items.map((item) => {
    const info = item.volumeInfo || {};
    return {
      id: item.id,
      title: info.title || 'Unknown Title',
      author: info.authors ? info.authors.join(', ') : 'Unknown Author',
      genre: info.categories ? info.categories[0] : 'General',
      image: thumbnail(info),
      description: info.description || '',
      publishedDate: info.publishedDate || '',
      pageCount: info.pageCount || null,
    };
  });
  return res.status(200).json(books);
};

const mostCommon = (values) => {
  const counts = new Map();
  for (const v of values) {
    const key = typeof v === 'string' ? v.trim() : '';
    if (key && key.toLowerCase() !== 'general') counts.set(key, (counts.get(key) || 0) + 1);
  }
  let best = null;
  let bestCount = 0;
  for (const [k, c] of counts) {
    if (c > bestCount) { best = k; bestCount = c; }
  }
  return best;
};

// @desc    Book suggestions from the user's most common genre / author
// @route   GET /api/search/suggestions
const getBookSuggestions = async (req, res) => {
  const books = await Book.find({ userId: req.user._id }).select('title author genre').lean();
  const owned = new Set(books.map((b) => String(b.title || '').trim().toLowerCase()));
  const notOwned = (s) => !owned.has(s.title.trim().toLowerCase());
  const fallback = () => FALLBACK_SUGGESTIONS.filter(notOwned).slice(0, MAX_SUGGESTIONS);

  if (!books.length) return res.json(fallback());

  const genre = mostCommon(books.map((b) => b.genre));
  const author = mostCommon(books.map((b) => b.author));

  const queries = [];
  if (author) queries.push({ q: `inauthor:"${author.replace(/"/g, '')}"`, reason: `more ${author}` });
  if (genre) queries.push({ q: `subject:"${genre.replace(/"/g, '')}"`, reason: `because you read ${genre.toLowerCase()}` });
  if (!queries.length) return res.json(fallback());

  const results = await Promise.allSettled(queries.map((x) => googleBooks(x.q, 20)));

  const seen = new Set();
  const suggestions = [];
  results.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    for (const item of r.value) {
      const info = item.volumeInfo || {};
      if (!item.id || !info.title || seen.has(item.id)) continue;
      const s = {
        id: item.id,
        title: info.title,
        author: info.authors ? info.authors.join(', ') : 'Unknown Author',
        year: (info.publishedDate || '').slice(0, 4),
        image: thumbnail(info),
        reason: queries[i].reason,
      };
      if (!notOwned(s)) continue;
      seen.add(item.id);
      suggestions.push(s);
    }
  });

  if (!suggestions.length) return res.json(fallback());

  // Interleave author and genre picks so both sources are represented.
  const byReason = queries.map((x) => suggestions.filter((s) => s.reason === x.reason));
  const mixed = [];
  for (let i = 0; mixed.length < MAX_SUGGESTIONS && byReason.some((l) => i < l.length); i += 1) {
    for (const list of byReason) {
      if (i < list.length && mixed.length < MAX_SUGGESTIONS) mixed.push(list[i]);
    }
  }
  return res.json(mixed);
};

module.exports = {
  searchExternalBooks,
  getBookSuggestions,
  FALLBACK_SUGGESTIONS,
};
