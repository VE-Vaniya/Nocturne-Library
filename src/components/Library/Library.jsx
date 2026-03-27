import React from 'react';
import './Library.css';

const Library = ({ books, setBooks }) => {
  const updateStatus = (id, newStatus) => {
    setBooks(books.map(b => b.id === id ? { ...b, status: newStatus } : b));
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

      <div className="library-grid-vert">
        {books.map(book => (
          <div key={book.id} className="book-card-vert">
            <div className="book-cover-container">
              {book.coverPreview ? (
                <img src={book.coverPreview} alt={book.title} className="book-cover-img" />
              ) : (
                <div className="book-cover-placeholder">
                  <span className="placeholder-text">{book.title.charAt(0).toUpperCase()}</span>
                  <span className="placeholder-genre">{book.genre}</span>
                </div>
              )}
            </div>
            
            <div className="book-content-vert">
               <div className="book-meta-vert">
                  <span className={`stamp ${getStampClass(book.status)}`}>
                    {book.status.toUpperCase()}
                  </span>
               </div>
               <h3 className="book-title-vert">{book.title}</h3>
               <p className="book-author-vert">by {book.author}</p>
               
               <div className="book-actions-vert">
                  <select 
                    value={book.status} 
                    onChange={(e) => updateStatus(book.id, e.target.value)}
                    className="status-dropdown-vert"
                  >
                    <option value="to-be-read">TO BE READ</option>
                    <option value="currently reading">CURRENTLY READING</option>
                    <option value="completed">COMPLETED</option>
                  </select>
               </div>
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
