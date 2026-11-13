const Book = require('../models/Book');

// Fields a client may change via PUT /api/books/:id. Anything else (userId,
// _id, ...) is ignored so a book can't be reassigned to another user.
const UPDATABLE_FIELDS = ['title', 'author', 'genre', 'status', 'progress', 'coverImage', 'moodTags', 'lastPageRead', 'lastRead'];

// @desc    Get all books for a user
// @route   GET /api/books
const getBooks = async (req, res) => {
  try {
    const books = await Book.find({ userId: req.user._id }).sort({ lastRead: -1 });
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a book
// @route   POST /api/books
const addBook = async (req, res) => {
  const { title, author, genre, status, progress, coverImage, moodTags, lastPageRead } = req.body;

  try {
    const book = await Book.create({
      userId: req.user._id,
      title,
      author,
      genre,
      status: status || 'wishlist',
      progress,
      coverImage,
      moodTags: moodTags || [],
      lastPageRead: lastPageRead || 0
    });

    res.status(201).json(book);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a book
// @route   PUT /api/books/:id
const updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Make sure the logged in user matches the book user
    if (book.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const updates = {};
    for (const field of UPDATABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    );

    res.status(200).json(updatedBook);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a book
// @route   DELETE /api/books/:id
const deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Make sure the logged in user matches the book user
    if (book.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await book.remove();

    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getBooks,
  addBook,
  updateBook,
  deleteBook
};
