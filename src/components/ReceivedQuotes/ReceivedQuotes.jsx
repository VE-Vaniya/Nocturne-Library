import React, { useState } from 'react';
import './ReceivedQuotes.css';
import SearchBar from '../common/SearchBar';

const ReceivedQuotes = ({ receivedQuotes, quotes, setQuotes }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMissives = receivedQuotes.filter(q => 
    q.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.bookTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddToGallery = (quote) => {
    const isAlreadyAdded = quotes.some(q => q.text === quote.text && q.author === quote.author);
    if (isAlreadyAdded) {
      alert('This missive is already in your Quotations Archive.');
      return;
    }
    const newQuote = {
      id: Date.now().toString(),
      text: quote.text,
      author: quote.author,
      bookTitle: quote.bookTitle,
      pageNumber: quote.pageNumber
    };
    setQuotes([...quotes, newQuote]);
    alert('Missive successfully transcribed to your Quotations Archive.');
  };

  return (
    <div className="rq-container">
      <div className="rq-header">
        <h2 className="rq-title">Received Missives</h2>
        <p className="rq-subtitle">Quotations shared with you by your scholarly connections</p>
      </div>

      <div className="secondary-search-wrap">
        <SearchBar 
          placeholder="Search your letterbox by sender or excerpt..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)}
          className="secondary-search-input"
        />
      </div>

      <div className="rq-list">
        {filteredMissives.length === 0 ? (
          <div className="empty-state">No missives match your inquiry.</div>
        ) : (
          filteredMissives.map((q) => (
             <div key={q.id} className="rq-missive-card">
                <div className="missive-sender-bar">
                   <span className="missive-icon">✉</span>
                   From: <strong className="m-sender">{q.sender}</strong>
                </div>
                <div className="missive-body">
                   <div className="missive-text">"{q.text}"</div>
                   <div className="missive-meta">
                     <span className="missive-author">{q.author}</span>
                     <span className="missive-book">({q.bookTitle})</span>
                     {q.pageNumber && <span className="missive-page"> p. {q.pageNumber}</span>}
                   </div>
                   <div className="missive-actions" style={{ marginTop: '0.8rem', textAlign: 'right' }}>
                     <button 
                       className="rq-action-btn" 
                       onClick={() => handleAddToGallery(q)}
                       style={{ 
                         background: 'transparent', 
                         border: '1px solid rgba(196, 165, 114, 0.4)', 
                         color: '#796e62', 
                         padding: '0.3rem 0.6rem', 
                         borderRadius: '4px', 
                         cursor: 'pointer',
                         fontSize: '0.8rem',
                         transition: 'all 0.2s',
                         fontFamily: 'var(--font-heading)'
                       }}
                       onMouseOver={(e) => { e.target.style.background = 'rgba(196, 165, 114, 0.1)'; e.target.style.color = 'var(--oxford-brown)'; }}
                       onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#796e62'; }}
                     >
                       + ADD TO GALLERY
                     </button>
                   </div>
                </div>
             </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReceivedQuotes;
