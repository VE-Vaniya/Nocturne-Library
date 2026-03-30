import React, { useState, useEffect } from 'react';
import './ReadingTimer.css';

const ReadingTimer = ({ quotes, setQuotes, books, setBooks, user }) => {
  const [mode, setMode] = useState('setup'); // setup, running, paused, concluding
  const [timerType, setTimerType] = useState('stopwatch'); // stopwatch or countdown
  const [durationLimit, setDurationLimit] = useState(30 * 60); // 30 minutes in seconds
  const [elapsed, setElapsed] = useState(0);

  const [selectedBook, setSelectedBook] = useState(books[0]?.title || '');

  // Pause States
  const [moodTags, setMoodTags] = useState('');
  const [pageNumber, setPageNumber] = useState('');

  // Quote State
  const [quoteFormOpen, setQuoteFormOpen] = useState(false);
  const [quoteText, setQuoteText] = useState('');
  const [quotePage, setQuotePage] = useState('');

  useEffect(() => {
    let interval = null;
    if (mode === 'running') {
      interval = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    if (books.length > 0 && !selectedBook) {
      setSelectedBook(books[0].title);
    }
  }, [books, selectedBook]);

  const handleStart = () => setMode('running');
  const handlePause = () => setMode('paused');
  const handleStop = () => {
    setMode('concluding');
  };

  const handleFinalConclude = () => {
    if (pageNumber || moodTags) {
      const bookIndex = books.findIndex(b => b.title === selectedBook);
      if (bookIndex !== -1) {
        const updatedBooks = [...books];
        const currentBook = updatedBooks[bookIndex];
        
        let newTags = currentBook.moodTags || [];
        if (moodTags) {
          const parsedTags = moodTags.split(',').map(t => t.trim()).filter(t => t);
          newTags = [...new Set([...newTags, ...parsedTags])];
        }

        updatedBooks[bookIndex] = {
          ...currentBook,
          lastPageRead: pageNumber || currentBook.lastPageRead || 0,
          moodTags: newTags
        };
        setBooks(updatedBooks);
      }
    }

    setMode('setup');
    setElapsed(0);
    setMoodTags('');
    setPageNumber('');
    setQuoteFormOpen(false);
  };

  const handleLogQuote = () => {
    if (!quoteText) return;
    const newQuote = {
      id: Date.now().toString(),
      text: quoteText,
      author: books.find(b => b.title === selectedBook)?.author || 'Unknown',
      bookTitle: selectedBook,
      pageNumber: quotePage,
    };
    setQuotes([...quotes, newQuote]);
    setQuoteText('');
    setQuotePage('');
    setQuoteFormOpen(false);
    alert('Quote securely archived in Quotations Gallery.');
  };

  // Format time MM:SS or HH:MM:SS
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Spotify integration snippet - Dark Academia playlist mock
  const spotifyEmbed = "https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0";

  return (
    <div className="timer-container">
      <div className="timer-header">
        <h2 className="timer-title">The Chronograph</h2>
        <p className="timer-subtitle">Record your literary immersion and curate ambient sounds</p>
      </div>

      <div className="timer-main-grid">
        <div className="timer-left-panel">
          {mode === 'setup' && (
            <div className="timer-setup">
               <label className="timer-label">Choose your Tome:</label>
               <select className="timer-input" value={selectedBook} onChange={e => setSelectedBook(e.target.value)}>
                 {books.map(b => (
                    <option key={b.id} value={b.title}>{b.title}</option>
                 ))}
                 {books.length === 0 && <option value="">No books available - Please visit The Archives</option>}
               </select>

               <label className="timer-label">Timer Mode:</label>
               <select className="timer-input" value={timerType} onChange={e => setTimerType(e.target.value)}>
                 <option value="stopwatch">Stopwatch (Count up from 0)</option>
                 <option value="countdown">Countdown (Count towards a goal)</option>
               </select>

               {timerType === 'countdown' && (
                 <>
                   <label className="timer-label">Session Duration (minutes):</label>
                   <input 
                     type="number" 
                     className="timer-input" 
                     value={durationLimit / 60} 
                     onChange={e => setDurationLimit(Math.max(1, Number(e.target.value)) * 60)} 
                   />
                 </>
               )}

               <button className="timer-action-btn start-btn" onClick={handleStart} disabled={books.length === 0}>
                 INITIATE READING SESSION
               </button>
            </div>
          )}

          {(mode === 'running' || mode === 'paused') && (
            <div className="timer-active">
              <div className="timer-display">
                {timerType === 'countdown' 
                  ? formatTime(Math.max(0, durationLimit - elapsed))
                  : formatTime(elapsed)
                }
              </div>

              <div className="timer-controls">
                {mode === 'running' ? (
                  <button className="timer-ctrl-btn pause-btn" onClick={handlePause}>PAUSE EXPEDITION</button>
                ) : (
                  <button className="timer-ctrl-btn resume-btn" onClick={handleStart}>RESUME EXPEDITION</button>
                )}
                <button className="timer-ctrl-btn stop-btn" onClick={handleStop}>CONCLUDE</button>
              </div>

              {mode === 'paused' && (
                <div className="timer-paused-actions slide-down">
                  <h4 className="paused-header">Session Paused — Update Progress</h4>
                  <div className="paused-stats">
                    Total Time Immersed: <strong>{formatTime(elapsed)}</strong>
                  </div>

                  <div className="paused-form-group">
                    <label>Mood Tags (comma separated, e.g. cozy, intense)</label>
                    <input type="text" placeholder="Enter tags..." className="timer-input" value={moodTags} onChange={(e)=>setMoodTags(e.target.value)} />
                  </div>

                  <div className="paused-form-group">
                    <label>Current Page Number</label>
                    <input type="number" placeholder="e.g. 142" className="timer-input" value={pageNumber} onChange={(e)=>setPageNumber(e.target.value)} />
                  </div>

                  <div className="quote-trigger">
                    <button className="link-btn" onClick={() => setQuoteFormOpen(!quoteFormOpen)}>
                      ✎ Log a Memorable Quote
                    </button>
                  </div>

                  {quoteFormOpen && (
                     <div className="quote-form slide-down">
                       <textarea 
                          placeholder="Transcribe the exact words here..." 
                          className="timer-textarea"
                          value={quoteText}
                          onChange={e => setQuoteText(e.target.value)}
                       />
                       <input 
                          type="text" 
                          placeholder="Page No." 
                          className="timer-input small" 
                          value={quotePage}
                          onChange={e => setQuotePage(e.target.value)}
                       />
                       <button className="timer-action-btn small-btn" onClick={handleLogQuote}>SEAL IN ARCHIVE</button>
                     </div>
                  )}
                </div>
              )}
            </div>
          )}

          {mode === 'concluding' && (
            <div className="timer-setup slide-down">
              <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--oxford-brown)', marginBottom: '1rem' }}>Conclude Your Session</h3>
              <p style={{ color: '#796e62', fontStyle: 'italic', marginBottom: '1.5rem', fontSize: '1rem' }}>Please log your final progress before archiving this session.</p>
              
              <div className="paused-form-group">
                <label className="timer-label">Mood Tags (comma separated)</label>
                <input type="text" placeholder="e.g. nostalgic, gripping..." className="timer-input" value={moodTags} onChange={(e)=>setMoodTags(e.target.value)} />
              </div>

              <div className="paused-form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="timer-label">Last Page Read</label>
                <input type="number" placeholder="Enter page number..." className="timer-input" value={pageNumber} onChange={(e)=>setPageNumber(e.target.value)} />
              </div>

              <button className="timer-action-btn stop-btn" style={{ width: '100%' }} onClick={handleFinalConclude}>
                SAVE & CONCLUDE
              </button>
            </div>
          )}
        </div>

        <div className="timer-right-panel">
          <div className="music-integration">
            <h4 className="music-header">♪ Ambient Accompaniment</h4>
            <p className="music-desc">Pair your reading session with classical ambiance via Spotify.</p>
            <iframe 
              style={{borderRadius: '4px'}} 
              src={spotifyEmbed} 
              width="100%" 
              height="352" 
              frameBorder="0" 
              allowFullScreen="" 
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
              loading="lazy"
              title="Spotify Ambient Music"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ReadingTimer;
