import React, { useState } from 'react';
import './Library.css';

const Library = ({ books, setBooks, setActiveNav }) => {
  const [openMoodsId, setOpenMoodsId] = useState(null);
  const updateStatus = (id, newStatus) => {
    setBooks(books.map(b => b.id === id ? { ...b, status: newStatus } : b));
  };

  const getStampClass = (status) => {
    if (status === 'completed') return 'stamp-completed';
    if (status === 'currently reading') return 'stamp-reading';
    return 'stamp-tbr';
  };

  const IconRead = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );

  const IconTag = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );

  return (
    <div className="library-container">
      <div className="library-header">
        <h2 className="library-title">The Archives</h2>
        <p className="library-subtitle">A catalog of your literary journeys</p>
      </div>

      <div className="library-grid-vert">
        {books.map(book => (
          <div key={book.id} className="library-card">
            <div className="library-card-img-wrap">
              {book.coverPreview ? (
                <img src={book.coverPreview} alt={book.title} className="library-card-img" />
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
                    onChange={(e) => updateStatus(book.id, e.target.value)}
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
        {books.length === 0 && (
          <div className="empty-state">No tomes reside in your archives yet. Visit "Add a Book" to begin.</div>
        )}
      </div>
    </div>
  );
};

export default Library;
