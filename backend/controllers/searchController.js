const axios = require('axios');

// @desc    Search for books using Open Library API
// @route   GET /api/search
const searchExternalBooks = async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    const response = await axios.get(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=20`
    );

    if (!response.data.docs || response.data.docs.length === 0) {
      return res.status(200).json([]);
    }

    // Map Open Library API response to our app's book format
    const books = response.data.docs.map(doc => {
      const coverId = doc.cover_i;
      const coverUrl = coverId
        ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
        : 'https://via.placeholder.com/128x192?text=No+Cover';

      return {
        id: doc.key ? doc.key.replace('/works/', '') : `ol_${Math.random().toString(36).substr(2, 9)}`,
        title: doc.title || 'Unknown Title',
        author: doc.author_name ? doc.author_name.slice(0, 3).join(', ') : 'Unknown Author',
        genre: doc.subject ? doc.subject[0] : 'General',
        image: coverUrl,
        description: '',
        publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : '',
      };
    });

    res.status(200).json(books);
  } catch (error) {
    console.error('External Search Error:', error.response ? error.response.data : error.message);
    res.status(500).json({
      error: error.message
    });
  }
};

module.exports = {
  searchExternalBooks
};
