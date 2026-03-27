import React, { useState } from 'react';
import './QuotesGallery.css';

const ConnectionsModal = ({ quote, onClose, onShare }) => {
  const connections = [
    { id: 1, name: 'Eleanor Vance', role: 'Chief Archivist' },
    { id: 2, name: 'Arthur Pym', role: 'Field Researcher' },
    { id: 3, name: 'Lenore Raven', role: 'Lyrical Poet' },
    { id: 4, name: 'Roderick Usher', role: 'Musical Surgeon' },
    { id: 5, name: 'Beatrix Thorne', role: 'Botanist' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content connection-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Share Missive</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <p className="modal-desc">Select a fellow scholar to send this excerpt.</p>
        <div className="connection-list">
          {connections.map(c => (
             <div key={c.id} className="connection-row">
                <div className="conn-avatar">{c.name.charAt(0)}</div>
                <div className="conn-info">
                  <div className="conn-name">{c.name}</div>
                  <div className="conn-role">{c.role}</div>
                </div>
                <button className="share-action-btn" onClick={() => onShare(c)}>SEND</button>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const QuotesGallery = ({ quotes }) => {
  const [sharingQuote, setSharingQuote] = useState(null);

  // Group quotes by bookTitle
  const groupedQuotes = quotes.reduce((acc, q) => {
    const title = q.bookTitle || 'Uncategorized';
    if (!acc[title]) acc[title] = [];
    acc[title].push(q);
    return acc;
  }, {});

  const handleShare = (connection) => {
    alert(`Quote sent to ${connection.name} successfully.`);
    setSharingQuote(null);
  };

  return (
    <div className="qg-container">
      <div className="qg-header">
        <h2 className="qg-title">Quotations Archive</h2>
        <p className="qg-subtitle">Memorable excerpts collected from your reading journeys</p>
      </div>

      <div className="qg-content">
        {Object.keys(groupedQuotes).length === 0 ? (
          <div className="empty-state">No quotations have been archived yet.</div>
        ) : (
          Object.entries(groupedQuotes).map(([bookTitle, bookQuotes]) => (
            <div key={bookTitle} className="qg-book-section">
              <h3 className="qg-book-title">{bookTitle}</h3>
              <div className="qg-grid">
                {bookQuotes.map(q => (
                  <div key={q.id} className="qg-card">
                    <div className="qg-quote-mark">“</div>
                    <div className="qg-quote-text">{q.text}</div>
                    <div className="qg-quote-meta">
                      <span className="qg-author">&mdash; {q.author || 'Unknown'}</span>
                      {q.pageNumber && <span className="qg-page">pg. {q.pageNumber}</span>}
                    </div>
                    <button className="qg-share-btn" onClick={() => setSharingQuote(q)}>
                      Share Quote
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {sharingQuote && (
        <ConnectionsModal 
          quote={sharingQuote} 
          onClose={() => setSharingQuote(null)}
          onShare={handleShare}
        />
      )}
    </div>
  );
};

export default QuotesGallery;
