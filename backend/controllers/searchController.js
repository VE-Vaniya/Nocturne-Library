const axios = require('axios');

// @desc    Search for books using Google Books API
// @route   GET /api/search
const searchExternalBooks = async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=20`);
    
    if (!response.data.items) {
      return res.status(200).json([]);
    }

    // Map Google Books API response to our app's book format
    const books = response.data.items.map(item => {
      const info = item.volumeInfo;
      return {
        id: item.id,
        title: info.title || 'Unknown Title',
        author: info.authors ? info.authors.join(', ') : 'Unknown Author',
        genre: info.categories ? info.categories[0] : 'General',
        image: info.imageLinks ? info.imageLinks.thumbnail.replace('http:', 'https:') : 'https://via.placeholder.com/128x192?text=No+Cover',
        description: info.description || '',
        publishedDate: info.publishedDate || '',
      };
    });

    res.status(200).json(books);
  } catch (error) {
    console.error('External Search Error:', error.message);
    res.status(500).json({ message: 'Failed to fetch results from external API' });
  }
};

module.exports = {
  searchExternalBooks
};
