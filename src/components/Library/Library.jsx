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

      <div className="library-grid">
        {books.map(book => (
          <div key={book.id} className="book-card">
            <div className="book-spine"></div>
            <div className="book-content">
               <div className="book-meta">
                  <span className="book-genre">{book.genre}</span>
                  <span className={`stamp ${getStampClass(book.status)}`}>
                    {book.status.toUpperCase()}
                  </span>
               </div>
               <h3 className="book-title">{book.title}</h3>
               <p className="book-author">by {book.author}</p>
               
               <div className="book-actions">
                  <label>Update Status: </label>
                  <select 
                    value={book.status} 
                    onChange={(e) => updateStatus(book.id, e.target.value)}
                    className="status-dropdown"
                  >
                    <option value="to-be-read">To Be Read</option>
                    <option value="currently reading">Currently Reading</option>
                    <option value="completed">Completed</option>
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
