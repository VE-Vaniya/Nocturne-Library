import React, { useState } from 'react';
import './QuotesGallery.css';
import SearchBar from '../common/SearchBar';
import { quoteService } from '../../services/api';

const ConnectionsModal = ({ quote, onClose, onShare, user }) => {
  const connections = (user?.connections || []).map(conn => ({
    id: conn._id,
    name: conn.fullName || conn.username,
    role: conn.email === 'librarian@nocturne.lib' ? 'Head Librarian' : 'Midnight Scholar',
    recipientId: conn._id
  }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content connection-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Share Missive</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <p className="modal-desc">Select a fellow scholar to send this excerpt.</p>
        <div className="connection-list">
          {connections.length > 0 ? (
            connections.map(c => (
              <div key={c.id} className="connection-row">
                  <div className="conn-avatar">{c.name.charAt(0)}</div>
                  <div className="conn-info">
                    <div className="conn-name">{c.name}</div>
                    <div className="conn-role">{c.role}</div>
                  </div>
                  <button className="share-action-btn" onClick={() => onShare(c)}>SEND</button>
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#796e62' }}>You have no connections to share with.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const QuotesGallery = ({ quotes, user }) => {
  const [sharingQuote, setSharingQuote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredQuotes = quotes.filter(q => 
    q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (q.author && q.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (q.bookTitle && q.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group quotes by bookTitle
  const groupedQuotes = filteredQuotes.reduce((acc, q) => {
    const title = q.bookTitle || 'Uncategorized';
    if (!acc[title]) acc[title] = [];
    acc[title].push(q);
    return acc;
  }, {});

  const handleShare = async (connection) => {
    try {
      await quoteService.share({
        quoteId: sharingQuote.id,
        recipientId: connection.recipientId,
        text: sharingQuote.text,
        author: sharingQuote.author,
        bookTitle: sharingQuote.bookTitle
      });
      alert(`Quote sent to ${connection.name} successfully.`);
    } catch (error) {
      console.error("Share error:", error);
      alert("Failed to share quote.");
    } finally {
      setSharingQuote(null);
    }
  };

  return (
    <div className="qg-container">
      <div className="qg-header">
        <h2 className="qg-title">Quotations Archive</h2>
        <p className="qg-subtitle">Memorable excerpts collected from your reading journeys</p>
      </div>

      <div className="secondary-search-wrap">
        <SearchBar 
          placeholder="Search your collected excerpts..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)}
          className="secondary-search-input"
        />
      </div>

      <div className="qg-content">
        {Object.keys(groupedQuotes).length === 0 ? (
          <div className="empty-state">No collected excerpts match your inquiry.</div>
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
          user={user}
        />
      )}
    </div>
  );
};

export default QuotesGallery;
