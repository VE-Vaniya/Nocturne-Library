import React, { useState, useEffect } from 'react';
import './Search.css';
import { searchService, bookService } from '../../services/api';

const IconAdd = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const Search = ({ query, books, setBooks, setActiveNav }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query || !query.trim() || query.trim().length < 3) {
      setResults([]);
      setError(null);
      return;
    }

    const fetchBooks = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await searchService.searchBooks(query);
        setResults(response.data);
      } catch (err) {
        console.error('Search failed:', err);
        const msg = err?.response?.data?.error || err?.response?.data?.message || err.message || 'Search failed';
        setError(msg);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [query]);

  const handleAddBook = async (book) => {
    if (books.some(b => b.title === book.title)) {
      alert(`${book.title} is already in your library.`);
      return;
    }
    const newBookData = {
      title: book.title,
      author: book.author,
      genre: book.genre,
      status: 'wishlist',
      coverImage: book.image,
      lastPageRead: 0,
      moodTags: []
    };
    try {
      const response = await bookService.addBook(newBookData);
      setBooks([...books, response.data]);
      alert(`${book.title} has been added to your Archives.`);
    } catch (error) {
      console.error("Failed to add book", error);
      alert("Failed to add book to the archive.");
    }
  };

  if (loading) {
    return (
      <div className="search-container">
        <div className="search-loading">
          <div className="spinner"></div>
          <p>Consulting the archives...</p>
        </div>
      </div>
    );
  }

  if (!query || !query.trim()) {
    return (
      <div className="search-container">
        <div className="search-empty">
          <div className="search-empty-icon">
            <svg width="48" height="48" fill="none" stroke="#a4937e" strokeWidth="1" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" />
            </svg>
          </div>
          <p>Type a book title or author in the search bar above.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="search-container">
      <div className="search-header">
        <h2 className="search-title">Search Results for "{query}"</h2>
        <span className="search-count">{results.length} book{results.length !== 1 ? 's' : ''} found</span>
      </div>

      {error && <p className="search-error">{error}</p>}

      {results.length > 0 ? (
        <div className="search-grid">
          {results.map(book => (
            <div key={book.id} className="search-card">
              <div className="search-card-img-wrap">
                <img src={book.image} alt={book.title} className="search-card-img" />
              </div>
              <div className="search-card-info">
                <div className="search-card-genre">{book.genre}</div>
                <h3 className="search-card-title">{book.title}</h3>
                <div className="search-card-author">by {book.author}</div>

                <div className="search-card-actions">
                  <button className="search-action-btn tooltip" data-tooltip="Add to Library" onClick={() => handleAddBook(book)}>
                    <IconAdd />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !loading && (
          <div className="search-empty">
            <div className="search-empty-icon">
              <svg width="48" height="48" fill="none" stroke="#a4937e" strokeWidth="1" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" />
              </svg>
            </div>
            <p>No books found matching your spell.</p>
          </div>
        )
      )}
    </div>
  );
};

export default Search;
