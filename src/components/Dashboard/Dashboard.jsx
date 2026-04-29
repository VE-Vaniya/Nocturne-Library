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
import Explore from '../Explore/Explore';

// Common Components
import { 
  IconGallery, IconLibrary, IconProfile, IconSearch, IconBell, IconMenu, IconClose, 
  IconFlame, IconBookOutline, IconLayout, IconTrophy, IconQuote, IconStarFilled, 
  IconStarEmpty, IconBookSmall, IconChevronRight, IconPlus, IconDashboard, 
  IconExplore, IconLogout, IconNetwork, IconTimer
} from '../common/Icons';
import StatCard from '../common/StatCard';
import ProgressBar from '../common/ProgressBar';
import SectionRule from '../common/SectionRule';
import SearchBar from '../common/SearchBar';
import avatar1 from '../Images/Avatars/avatar1.png';
import avatar2 from '../Images/Avatars/avatar2.png';
import avatar3 from '../Images/Avatars/avatar3.png';
import avatar4 from '../Images/Avatars/avatar4.png';
import avatar5 from '../Images/Avatars/avatar5.png';

const avatars = [avatar1, avatar2, avatar3, avatar4, avatar5];

/* ── Component ────────────────────────────────────── */
const Dashboard = ({ user, onLogout, books, setBooks, quotes, setQuotes, receivedQuotes, setReceivedQuotes, users, setUsers, connectionRequests, setConnectionRequests, fetchProfile }) => {
  const getSearchPlaceholder = () => {
    switch (activeNav) {
      case 'Quotes Gallery':
        return 'Gallery search';
      case 'Explore':
        return 'Search profiles';
      case 'Library':
      default:
        return 'Search the book world';
    }
  };

  const username = user?.username || 'Scholar';
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());

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
    { label: 'Explore', icon: <IconNetwork /> },
    { label: 'My Profile', icon: <IconProfile /> },
    { label: 'Add a Book', icon: <IconPlus /> },
  ];

  const defaultQuotes = [
    { text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", author: "GEORGE R.R. MARTIN" },
    { text: "There is no friend as loyal as a book.", author: "ERNEST HEMINGWAY" },
    { text: "Fairy tales are more than true: not because they tell us that dragons exist, but because they tell us that dragons can be beaten.", author: "NEIL GAIMAN" }
  ];

  const [displayQuotes, setDisplayQuotes] = useState(quotes && quotes.length > 0 ? quotes : defaultQuotes);
  const [quoteIndex, setQuoteIndex] = useState(Math.floor(Math.random() * (quotes && quotes.length > 0 ? quotes.length : defaultQuotes.length)));

  useEffect(() => {
    setDisplayQuotes(quotes && quotes.length > 0 ? quotes : defaultQuotes);
  }, [quotes]);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex(prevIndex => {
        const nextIndex = Math.floor(Math.random() * displayQuotes.length);
        if (displayQuotes.length > 1 && nextIndex === prevIndex) {
          return (nextIndex + 1) % displayQuotes.length;
        }
        return nextIndex;
      });
    }, 10000);

    return () => clearInterval(timer);
  }, [displayQuotes]);

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
            <SectionRule className="sidebar-rule" />
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
          <div className="sidebar-user-brief">
            <div className="user-brief-avatar">
              <img src={avatars[user?.avatar ? parseInt(user.avatar) : 0]} alt="User Avatar" />
            </div>
            <div className="user-brief-info">
              <div className="user-brief-name">{user?.fullName || 'Scholar'}</div>
              <div className="user-brief-rank">{user?.email === 'librarian@nocturne.lib' ? 'Head Librarian' : 'Midnight Scholar'}</div>
            </div>
          </div>
          <button className="cr-action-btn logout-btn" onClick={onLogout} title="Logout">
            <IconLogout /> LOGOUT
          </button>
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

          <SearchBar 
            placeholder={getSearchPlaceholder()} 
            value={searchQuery} 
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim().length > 0 && document.activeElement === e.target) {
                setActiveNav('Search');
              }
            }}
            containerClass="search-bar"
          />

          <div className="topbar-actions">
            <span className="date-text">{today}</span>
            <button className="notif-btn" onClick={() => setNotifOpen(true)}>
              <IconBell />
              {(connectionRequests.some(r => r.to?.toLowerCase() === user?.email?.toLowerCase() && r.status === 'pending')) && (
                <span className="notif-dot"></span>
              )}
            </button>
            <div className="topbar-avatar" onClick={() => setActiveNav('My Profile')} title="View Profile">
              <img src={avatars[user?.avatar ? parseInt(user.avatar) : 0]} alt="Profile" />
            </div>
          </div>
        </header>

        <main className={`content-scroller ${activeNav === 'My Profile' || activeNav === 'Explore' ? 'no-padding' : ''}`}>
          <div className={activeNav === 'My Profile' || activeNav === 'Explore' ? 'full-width-pane' : 'content-inner'}>
            {activeNav === 'Search' ? (
              <Search query={searchQuery} books={books} setBooks={setBooks} setActiveNav={setActiveNav} />
            ) : activeNav === 'Add a Book' ? (
              <AddBook books={books} setBooks={setBooks} setActiveNav={setActiveNav} />
            ) : activeNav === 'My Profile' ? (
              <MyProfile user={user} connectionRequests={connectionRequests} setConnectionRequests={setConnectionRequests} fetchProfile={fetchProfile} />
            ) : activeNav === 'Explore' ? (
              <Explore currentUser={user} users={users} connectionRequests={connectionRequests} setConnectionRequests={setConnectionRequests} fetchProfile={fetchProfile} />
            ) : activeNav === 'Library' ? (
              <Library books={books} setBooks={setBooks} setActiveNav={setActiveNav} />
            ) : activeNav === 'Quotes Gallery' ? (
              <QuotesGallery quotes={quotes} user={user} />
            ) : activeNav === 'Received Missives' ? (
              <ReceivedQuotes receivedQuotes={receivedQuotes} quotes={quotes} setQuotes={setQuotes} />
            ) : activeNav === 'Reading Timer' ? (
              <ReadingTimer quotes={quotes} setQuotes={setQuotes} books={books} setBooks={setBooks} user={user} />
            ) : (
              <>
                <div className="welcome-section">
                  <span className="welcome-text">Your personal reading sanctuary awaits</span>
                  <SectionRule className="welcome-rule" />
                </div>

                <div className="stats-row">
                  <StatCard icon={<IconFlame />} value="1" label="Day Streak" sub="DAYS" colorClass="color-flame" />
                  <StatCard icon={<IconBookOutline />} value={books.filter(b => b.status === 'completed').length || 0} label="Books Read" sub="TOTAL" colorClass="color-gold" />
                  <StatCard icon={<IconLayout />} value={user?.pagesReadToday || 0} label="Pages Today" sub="PAGES" colorClass="color-brown" />
                  <StatCard icon={<IconTrophy />} value={Math.floor((user?.readingTime || 0) / 60)} label="Minutes Read" sub="TODAY" colorClass="color-green" />
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
                          <div className="cr-genre">{books[0]?.genre || 'CLASSIC FICTION'}</div>
                          <h2 className="cr-title">{books[0]?.title || 'Crime and Punishment'}</h2>
                          <div className="cr-author">by {books[0]?.author || 'Fyodor Dostoevsky'}</div>
                          <div className="cr-stars">
                            <IconStarFilled /><IconStarFilled /><IconStarFilled /><IconStarFilled /><IconStarEmpty />
                          </div>
                        </div>
                      </div>

                      <div className="cr-progress">
                        <div className="cr-progress-labels">
                          <span>Mood Tags So Far</span>
                        </div>
                        <div className="cr-mood-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                          {books[0]?.moodTags && books[0].moodTags.length > 0 ? (
                            books[0].moodTags.map((tag, idx) => (
                              <span key={idx} style={{ background: 'rgba(196, 165, 114, 0.2)', color: 'var(--oxford-brown)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid rgba(196, 165, 114, 0.5)' }}>
                                #{tag.trim()}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: '#796e62', fontStyle: 'italic' }}>No moods registered yet.</span>
                          )}
                        </div>
                      </div>

                      <button className="cr-action-btn" onClick={() => setActiveNav('Reading Timer')}>
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
                        "{displayQuotes[quoteIndex]?.text}"
                      </div>
                      <div className="quote-author">
                        &mdash; {displayQuotes[quoteIndex]?.author || 'Unknown'}
                      </div>
                      <div className="quote-nav">
                        {displayQuotes.map((_, idx) => (
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

                      <ProgressBar label="Books this year" current={books.filter(b => b.status === 'completed').length || 0} total="10" colorClass="fill-gold" widthPercent={`${Math.min(100, ((books.filter(b => b.status === 'completed').length || 0) / 10) * 100)}%`} />
                      <ProgressBar label="Pages today" current={user?.pagesReadToday || 0} total="50" colorClass="fill-orange" widthPercent={`${Math.min(100, ((user?.pagesReadToday || 0) / 50) * 100)}%`} />
                      <ProgressBar label="Minutes read today" current={Math.floor((user?.readingTime || 0) / 60)} total="60" colorClass="fill-brown" widthPercent={`${Math.min(100, (Math.floor((user?.readingTime || 0) / 60) / 60) * 100)}%`} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <Notifications
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        connectionRequests={connectionRequests}
        setConnectionRequests={setConnectionRequests}
        user={user}
        fetchProfile={fetchProfile}
      />
    </div>
  );
};

export default Dashboard;
