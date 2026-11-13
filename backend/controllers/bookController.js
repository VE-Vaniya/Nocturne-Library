const Book = require('../models/Book');
const { isObjectId } = require('../utils/helpers');

// Fields a client may set via POST / PUT. Anything else (userId, _id, ...)
// is ignored so a book can't be reassigned to another user.
const UPDATABLE_FIELDS = ['title', 'author', 'genre', 'status', 'progress', 'coverImage', 'totalPages', 'moodTags', 'lastPageRead', 'lastRead'];

const pick = (body) => {
  const out = {};
  for (const field of UPDATABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body || {}, field)) out[field] = body[field];
  }
  return out;
};

const findOwnBook = (id, userId) => (isObjectId(id) ? Book.findOne({ _id: id, userId }) : null);

// @desc    Get all books for a user
// @route   GET /api/books
const getBooks = async (req, res) => {
  const books = await Book.find({ userId: req.user._id }).sort({ lastRead: -1 });
  res.status(200).json(books);
};

// @desc    Add a book
// @route   POST /api/books
const addBook = async (req, res) => {
  const fields = pick(req.body);
  if (typeof fields.title !== 'string' || !fields.title.trim()
    || typeof fields.author !== 'string' || !fields.author.trim()) {
    return res.status(400).json({ message: 'Title and author are required' });
  }
  const book = await Book.create({
    status: 'wishlist',
    moodTags: [],
    lastPageRead: 0,
    ...fields,
    userId: req.user._id,
  });
  return res.status(201).json(book);
};

// @desc    Update a book
// @route   PUT /api/books/:id
const updateBook = async (req, res) => {
  const book = await findOwnBook(req.params.id, req.user._id);
  // Someone else's book is reported as "not found" so its existence is not leaked.
  if (!book) return res.status(404).json({ message: 'Book not found' });

  const updatedBook = await Book.findByIdAndUpdate(
    book._id,
    { $set: pick(req.body) },
    { returnDocument: 'after', runValidators: true }
  );
  return res.status(200).json(updatedBook);
};

// @desc    Delete a book
// @route   DELETE /api/books/:id
const deleteBook = async (req, res) => {
  const book = await findOwnBook(req.params.id, req.user._id);
  if (!book) return res.status(404).json({ message: 'Book not found' });
  await book.deleteOne();
  return res.status(200).json({ id: req.params.id });
};

module.exports = {
  getBooks,
  addBook,
  updateBook,
  deleteBook
};
