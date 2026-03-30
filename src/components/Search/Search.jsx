import React from 'react';
import './Search.css';
import prideImg from '../Images/pride.jpg';
import orwell1984Img from '../Images/1984.jpg';
import mockingbirdImg from '../Images/mockingbird.jpg';
import gatsbyImg from '../Images/gatsby.jpg';
import mobydickImg from '../Images/mobydick.jpg';
import hobbitImg from '../Images/hobbit.jpg';

const IconAdd = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const IconRead = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const ALL_BOOKS = [
  { id: 1, title: 'Pride and Prejudice', author: 'Jane Austen', image: prideImg, genre: 'Romance' },
  { id: 2, title: '1984', author: 'George Orwell', image: orwell1984Img, genre: 'Dystopian' },
  { id: 3, title: 'To Kill a Mockingbird', author: 'Harper Lee', image: mockingbirdImg, genre: 'Classic Fiction' },
  { id: 4, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', image: gatsbyImg, genre: 'Tragedy' },
  { id: 5, title: 'Moby Dick', author: 'Herman Melville', image: mobydickImg, genre: 'Adventure' },
  { id: 6, title: 'The Hobbit', author: 'J.R.R. Tolkien', image: hobbitImg, genre: 'Fantasy' }
];

const Search = ({ query, books, setBooks, setActiveNav }) => {
  const filteredBooks = ALL_BOOKS.filter(book => 
    book.title.toLowerCase().includes(query.toLowerCase()) ||
    book.author.toLowerCase().includes(query.toLowerCase()) ||
    book.genre.toLowerCase().includes(query.toLowerCase())
  );

  const handleAddBook = (book) => {
    if (books.some(b => b.title === book.title)) {
      alert(`${book.title} is already in your library.`);
      return;
    }
    const newBook = {
      id: Date.now().toString(),
      title: book.title,
      author: book.author,
      genre: book.genre,
      status: 'to-be-read',
      coverPreview: book.image,
      lastPageRead: 0,
      moodTags: []
    };
    setBooks([...books, newBook]);
    alert(`${book.title} has been added to your Archives.`);
  };

  return (
    <div className="search-container">
      <div className="search-header">
        <h2 className="search-title">Search Results for "{query}"</h2>
        <span className="search-count">{filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''} found</span>
      </div>
      
      {filteredBooks.length > 0 ? (
        <div className="search-grid">
          {filteredBooks.map(book => (
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
        <div className="search-empty">
          <div className="search-empty-icon">
             <svg width="48" height="48" fill="none" stroke="#a4937e" strokeWidth="1" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" />
             </svg>
          </div>
          <p>No books found matching your spell.</p>
        </div>
      )}
    </div>
  );
};

export default Search;
