import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import Search from '../Search/Search';
import AddBook from '../AddBook/AddBook';
import Notifications from '../Notifications/Notifications';
import MyProfile from '../MyProfile/MyProfile';
import Library from '../Library/Library';
import QuotesGallery from '../QuotesGallery/QuotesGallery';
import ReceivedQuotes from '../ReceivedQuotes/ReceivedQuotes';
import ReadingTimer from '../ReadingTimer/ReadingTimer';

/* ── SVG Icons ────────────────────────────────────── */
const IconGallery = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const IconLibrary = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M4 19V5a2 2 0 012-2h13a1 1 0 011 1v14" /><path d="M4 19a2 2 0 002 2h13M4 19a2 2 0 002-2" /><path d="M9 7h6m-6 4h6" />
  </svg>
);
const IconProfile = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);
const IconSearch = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" />
  </svg>
);
const IconBell = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M18 16v-5a6 6 0 00-12 0v5H4l2 2h12l2-2h-2z" /><path d="M10 19a2 2 0 004 0" />
  </svg>
);
const IconMenu = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M3 12h18M3 6h18M3 18h18" />
  </svg>
);
const IconClose = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const IconFlame = () => (
  <svg width="22" height="22" fill="none" stroke="#d56038" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M12 2c0 0-5 6.55-5 12 0 2.76 2.24 5 5 5s5-2.24 5-5c0-5.45-5-12-5-12z" />
    <path d="M12 10c-1 2-1 4.5 0 6" />
  </svg>
);
const IconBookOutline = () => (
  <svg width="22" height="22" fill="none" stroke="#c4a572" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M4 19V5a2 2 0 012-2h13a1 1 0 011 1v14M4 19a2 2 0 002 2h13M4 19a2 2 0 002-2h13" />
    <path d="M9 7h6M9 11h6" />
  </svg>
);
const IconLayout = () => (
  <svg width="22" height="22" fill="none" stroke="#756452" strokeWidth="1.5" viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 3v18M3 9h6M15 3v18" />
  </svg>
);
const IconTrophy = () => (
  <svg width="22" height="22" fill="none" stroke="#5a7e63" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M8 21h8M12 17v4M7 4h10M6 4v5c0 3.31 2.69 6 6 6s6-2.69 6-6V4" />
    <path d="M6 5H4a2 2 0 00-2 2v1a4 4 0 004 4h0M18 5h2a2 2 0 012 2v1a4 4 0 01-4 4h0" />
  </svg>
);
const IconQuote = () => (
  <svg width="32" height="32" fill="#bc9f6b" viewBox="0 0 24 24" opacity="0.4">
    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
  </svg>
);
const IconStarFilled = () => (
  <svg width="14" height="14" fill="#c4a572" viewBox="0 0 24 24">
    <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/>
  </svg>
);
const IconStarEmpty = () => (
  <svg width="14" height="14" fill="#e6dfcc" viewBox="0 0 24 24">
    <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/>
  </svg>
);
const IconBookSmall = () => (
  <svg width="16" height="16" fill="none" stroke="#a4937e" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M4 19V5a2 2 0 012-2h13a1 1 0 011 1v14M4 19a2 2 0 002 2h13" />
  </svg>
);
const IconChevronRight = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M9 18l6-6-6-6" />
  </svg>
);
const IconEditPen = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconPlus = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const IconDashboard = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const IconExplore = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" /><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
  </svg>
);
const IconNotes = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" />
  </svg>
);
const IconBookmark = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
  </svg>
);
const IconTimer = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /><path d="M9 2h6" />
  </svg>
);

const IconLogout = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

/* ── Component ────────────────────────────────────── */
const Dashboard = ({ user, onLogout, books, setBooks, quotes, setQuotes, receivedQuotes, setReceivedQuotes }) => {
  const username = user?.username || 'Scholar';
  const [activeNav, setActiveNav] = useState('Library');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const today = "Thu, Mar 12";

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    if (mq.matches) setSidebarOpen(false);
    const handler = (e) => { if (e.matches) setSidebarOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const navItems = [
    { label: 'Dashboard', icon: <IconDashboard /> },
    { label: 'Search', icon: <IconSearch /> },
    { label: 'Received Missives', icon: <IconExplore /> },
    { label: 'Quotes Gallery', icon: <IconGallery /> },
    { label: 'Library', icon: <IconLibrary />, chevron: true },
    { label: 'Reading Timer', icon: <IconTimer /> },
    { label: 'My Profile', icon: <IconProfile /> },
    { label: 'Add a Book', icon: <IconPlus /> },
  ];

  const dailyQuotes = [
    { text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", author: "GEORGE R.R. MARTIN" },
    { text: "There is no friend as loyal as a book.", author: "ERNEST HEMINGWAY" },
    { text: "Fairy tales are more than true: not because they tell us that dragons exist, but because they tell us that dragons can be beaten.", author: "NEIL GAIMAN" }
  ];

  return (
    <div className="dashboard-root">
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="brand-wrap">
            <h1 className="brand-name">Nocturne</h1>
            <div className="brand-sub">LIBRARY</div>
            <div className="brand-rule">
              <span className="line"></span>
              <span className="diamond"></span>
              <span className="line"></span>
            </div>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <IconClose />
          </button>
        </div>

        <nav className="nav-menu">
          {navItems.map(({ label, icon, chevron }) => (
            <button
              key={label}
              className={`nav-item ${activeNav === label ? 'active' : ''}`}
              onClick={() => setActiveNav(label)}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-text">{label}</span>
              {chevron && <span className="nav-chevron"><IconChevronRight /></span>}
            </button>
          ))}
        </nav>



        <div className="sidebar-footer">
          <div className="sidebar-user-info" onClick={() => setActiveNav('My Profile')}>
            <div className="user-avatar-mini">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="user-meta">
              <span className="user-name">{username}</span>
              <span className="user-role">Scholar</span>
            </div>
          </div>
          <div className="footer-actions">
            <button className="edit-btn" onClick={() => setActiveNav('My Profile')} title="Edit Profile">
              <IconEditPen />
            </button>
            <button className="logout-btn" onClick={onLogout} title="Logout">
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ───────────────────────── */}
      <div className="main-area">
        <header className="topbar">
          <button 
            className="menu-btn" 
            onClick={() => setSidebarOpen(true)}
            style={{ visibility: sidebarOpen ? 'hidden' : 'visible' }}
          >
            <IconMenu />
          </button>

          <div className="search-bar">
            <IconSearch />
            <input
              type="text"
              placeholder="Search your library..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim().length > 0) setActiveNav('Search');
              }}
            />
          </div>

          <div className="topbar-actions">
            <span className="date-text">{today}</span>
            <button className="notif-btn" onClick={() => setNotifOpen(true)}>
              <IconBell />
              <span className="notif-dot"></span>
            </button>
          </div>
        </header>

        <main className={`content-scroller ${activeNav === 'My Profile' ? 'no-padding' : ''}`}>
          <div className={activeNav === 'My Profile' ? 'full-width-pane' : 'content-inner'}>
            {activeNav === 'Search' ? (
              <Search query={searchQuery} />
            ) : activeNav === 'Add a Book' ? (
              <AddBook books={books} setBooks={setBooks} setActiveNav={setActiveNav} />
            ) : activeNav === 'My Profile' ? (
              <MyProfile user={user} />
            ) : activeNav === 'Library' ? (
              <Library books={books} setBooks={setBooks} />
            ) : activeNav === 'Quotes Gallery' ? (
              <QuotesGallery quotes={quotes} />
            ) : activeNav === 'Received Missives' ? (
              <ReceivedQuotes receivedQuotes={receivedQuotes} />
            ) : activeNav === 'Reading Timer' ? (
              <ReadingTimer quotes={quotes} setQuotes={setQuotes} books={books} user={user} />
            ) : (
              <>
            <div className="welcome-section">
              <span className="welcome-text">Your personal reading sanctuary awaits</span>
              <div className="welcome-rule">
                <span className="line"></span>
                <span className="diamond"></span>
                <span className="line"></span>
              </div>
            </div>

            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-icon"><IconFlame /></div>
                <div className="stat-num color-flame">14</div>
                <div className="stat-label">Day Streak</div>
                <div className="stat-sub">DAYS</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><IconBookOutline /></div>
                <div className="stat-num color-gold">47</div>
                <div className="stat-label">Books Read</div>
                <div className="stat-sub">TOTAL</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><IconLayout /></div>
                <div className="stat-num color-brown">82</div>
                <div className="stat-label">Pages Today</div>
                <div className="stat-sub">PAGES</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><IconTrophy /></div>
                <div className="stat-num color-green">3</div>
                <div className="stat-label">Books Read</div>
                <div className="stat-sub">THIS MONTH</div>
              </div>
            </div>

            <div className="bento-grid">
              
              {/* Left Column */}
              <div className="col-left">
                <div className="panel cr-panel">
                  <div className="panel-header">
                    <IconBookSmall />
                    <span>LAST READ BOOK</span>
                  </div>
                  
                  <div className="cr-main">
                    <div className="cr-book-spine"></div>
                    <div className="cr-book-info">
                      <div className="cr-genre">CLASSIC FICTION</div>
                      <h2 className="cr-title">Crime and Punishment</h2>
                      <div className="cr-author">by Fyodor Dostoevsky</div>
                      <div className="cr-stars">
                        <IconStarFilled /><IconStarFilled /><IconStarFilled /><IconStarFilled /><IconStarEmpty />
                      </div>
                    </div>
                  </div>

                  <div className="cr-progress">
                    <div className="cr-progress-labels">
                      <span>Progress</span>
                      <span>351 / 551 pages</span>
                    </div>
                    <div className="cr-progress-track">
                      <div className="cr-progress-fill" style={{ width: '68%' }}></div>
                    </div>
                    <div className="cr-progress-caption">68% complete</div>
                  </div>

                  <button className="cr-action-btn">
                    CONTINUE READING &rarr;
                  </button>
                </div>
              </div>

              {/* Right Column */}
              <div className="col-right">
                <div className="panel quote-panel">
                  <div className="quote-mark">
                    <IconQuote />
                  </div>
                  <div className="quote-body">
                    "{dailyQuotes[quoteIndex].text}"
                  </div>
                  <div className="quote-author">
                    &mdash; {dailyQuotes[quoteIndex].author}
                  </div>
                  <div className="quote-nav">
                    {dailyQuotes.map((_, idx) => (
                      <button 
                        key={idx} 
                        className={`quote-dot ${idx === quoteIndex ? 'active' : ''}`}
                        onClick={() => setQuoteIndex(idx)}
                        aria-label={`Go to quote ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="panel goals-panel">
                  <div className="panel-header">
                    <IconTrophy />
                    <span>READING GOALS</span>
                  </div>

                  <div className="goal-row">
                    <div className="goal-labels">
                      <span className="goal-name">Books this year</span>
                      <span className="goal-vals"><strong>47</strong>/52</span>
                    </div>
                    <div className="goal-track">
                      <div className="goal-fill fill-gold" style={{ width: '90%' }}></div>
                    </div>
                  </div>

                  <div className="goal-row">
                    <div className="goal-labels">
                      <span className="goal-name">Pages this week</span>
                      <span className="goal-vals"><strong>320</strong>/500</span>
                    </div>
                    <div className="goal-track">
                      <div className="goal-fill fill-orange" style={{ width: '64%' }}></div>
                    </div>
                  </div>

                  <div className="goal-row">
                    <div className="goal-labels">
                      <span className="goal-name">Minutes read today</span>
                      <span className="goal-vals"><strong>45</strong>/60</span>
                    </div>
                    <div className="goal-track">
                      <div className="goal-fill fill-brown" style={{ width: '75%' }}></div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
              </>
            )}

          </div>
        </main>
      </div>

      <Notifications isOpen={notifOpen} onClose={() => setNotifOpen(false)} />

    </div>
  );
};

export default Dashboard;
