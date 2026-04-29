import React, { useState } from 'react';
import './Library.css';
import { IconRead, IconTag } from '../common/Icons';
import SearchBar from '../common/SearchBar';

const Library = ({ books, setBooks, setActiveNav }) => {
  const [openMoodsId, setOpenMoodsId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const updateStatus = async (id, newStatus) => {
    try {
      const { bookService } = await import('../../services/api');
      await bookService.updateBook(id, { status: newStatus });
      setBooks(books.map(b => (b._id === id || b.id === id) ? { ...b, status: newStatus } : b));
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const getStampClass = (status) => {
    if (status === 'completed') return 'stamp-completed';
    if (status === 'currently reading') return 'stamp-reading';
    return 'stamp-tbr';
  };

  return (
    <div className="library-container">
      <div className="library-header">
        <h2 className="library-title">The Archives</h2>
        <p className="library-subtitle">A catalog of your literary journeys</p>
      </div>

      <div className="secondary-search-wrap">
        <SearchBar 
          placeholder="Search your archives by title or scribe..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)}
          className="secondary-search-input"
        />
      </div>

      <div className="library-grid-vert">
        {filteredBooks.map(book => (
          <div key={book.id} className="library-card">
            <div className="library-card-img-wrap">
              {(book.coverImage || book.coverPreview) ? (
                <img src={book.coverImage || book.coverPreview} alt={book.title} className="library-card-img" />
              ) : (
                <div className="library-cover-placeholder">
                  <span className="placeholder-text">{book.title.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>

            <div className="library-card-info">
              <div className="library-card-header-row">
                <div className="library-card-genre">{book.genre || 'Uncategorized'}</div>
                <span className={`stamp ${getStampClass(book.status)}`}>
                  {book.status.toUpperCase()}
                </span>
              </div>
              <h3 className="library-card-title">{book.title}</h3>
              <p className="library-card-author">by {book.author}</p>

              <div className="library-card-actions">
                <div className="library-action-group">
                  <button
                    className={`library-action-btn ${openMoodsId === book.id ? 'active' : ''}`}
                    onClick={() => setOpenMoodsId(openMoodsId === book.id ? null : book.id)}
                    title="View Mood Tags"
                  >
                    <IconTag /> Moods
                  </button>
                  <button
                    className="library-action-btn"
                    onClick={() => {
                      // Switch nav to Reading Timer
                      setActiveNav('Reading Timer');
                    }}
                    title="Start Reading"
                  >
                    <IconRead /> Read
                  </button>
                </div>

                <select
                  value={book.status}
                  onChange={(e) => updateStatus(book._id || book.id, e.target.value)}
                  className="status-dropdown-inline"
                >
                  <option value="to-be-read">TO BE READ</option>
                  <option value="currently reading">CURRENTLY READING</option>
                  <option value="completed">COMPLETED</option>
                </select>
              </div>

              {openMoodsId === book.id && (
                <div className="moods-popup slide-down">
                  <div className="moods-popup-title">Moods & Impressions</div>
                  {book.moodTags && book.moodTags.length > 0 ? (
                    <div className="moods-list">
                      {book.moodTags.map((tag, idx) => (
                        <span key={idx} className="mood-tag">#{tag}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="moods-empty">No moods logged for this tome yet.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {filteredBooks.length === 0 && (
          <div className="empty-state">No tomes match your inquiry.</div>
        )}
      </div>
    </div>
  );
};

export default Library;
