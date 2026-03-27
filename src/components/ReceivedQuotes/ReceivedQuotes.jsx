import React from 'react';
import './ReceivedQuotes.css';

const ReceivedQuotes = ({ receivedQuotes }) => {
  return (
    <div className="rq-container">
      <div className="rq-header">
        <h2 className="rq-title">Received Missives</h2>
        <p className="rq-subtitle">Quotations shared with you by your scholarly connections</p>
      </div>

      <div className="rq-list">
        {receivedQuotes.length === 0 ? (
          <div className="empty-state">Your letterbox is currently empty.</div>
        ) : (
          receivedQuotes.map((q) => (
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
                </div>
             </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReceivedQuotes;
