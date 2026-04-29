import React, { useState } from 'react';
import './ReceivedQuotes.css';
import SearchBar from '../common/SearchBar';

const ReceivedQuotes = ({ receivedQuotes, quotes, setQuotes }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMissives = (receivedQuotes || []).filter(q => {
    const sender = q.senderName || q.sender || 'Unknown';
    const text = q.text || '';
    const author = q.author || '';
    const bookTitle = q.bookTitle || '';
    
    return sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
           text.toLowerCase().includes(searchQuery.toLowerCase()) ||
           author.toLowerCase().includes(searchQuery.toLowerCase()) ||
           bookTitle.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleAddToGallery = async (quote) => {
    const isAlreadyAdded = quotes.some(q => q.text === quote.text && q.author === quote.author);
    if (isAlreadyAdded) {
      alert('This missive is already in your Quotations Archive.');
      return;
    }
    const newQuoteData = {
      text: quote.text,
      author: quote.author || 'Unknown',
      bookTitle: quote.bookTitle || '',
      pageNumber: quote.pageNumber || ''
    };
    
    try {
      const { quoteService } = await import('../../services/api');
      const response = await quoteService.addQuote(newQuoteData);
      setQuotes([...quotes, response.data]);
      alert('Missive successfully transcribed to your Quotations Archive.');
    } catch (error) {
      console.error("Failed to add missive to gallery", error);
      alert("Failed to archive the missive.");
    }
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
                   From: <strong className="m-sender">{q.senderName || q.sender || 'Unknown'}</strong>
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
