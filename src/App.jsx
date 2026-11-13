import React, { useState, useEffect, useCallback } from 'react';
import { authService, notificationService, userService, bookService, quoteService, missiveService } from './services/api';
import Login from './components/Login/Login';
import Signup from './components/Signup/Signup';
import Dashboard from './components/Dashboard/Dashboard';
import './index.css';
import backgroundImage from './components/Images/Background.png';

import DustMotes from './components/common/DustMotes';
import SectionRule from './components/common/SectionRule';

const SESSION_KEY = 'nocturne_logged_in_user';

// Older builds cached a demo user list (with plaintext passwords) here; drop it.
try {
  localStorage.removeItem('nocturne_users');
} catch {
  // storage unavailable; nothing to clean up
}

const loadSavedUser = () => {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

function App() {
  const [user, setUser] = useState(loadSavedUser);

  // Resume straight into the dashboard when a saved session (with a token) exists
  const [view, setView] = useState(() => (loadSavedUser()?.token ? 'dashboard' : 'login'));

  const [books, setBooks] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [receivedQuotes, setReceivedQuotes] = useState([]);
  const [connectionRequests, setConnectionRequests] = useState([]);

  const token = user?.token;

  const fetchProfile = useCallback(async () => {
    if (!token) return;
    try {
      const response = await authService.getProfile();
      // The profile response carries no token; keep the one we already have,
      // otherwise every later request would go out unauthenticated (401).
      setUser(prev => (prev ? { ...prev, ...response.data, token: prev.token } : prev));
    } catch (error) {
      // Only an explicit 401 means the session is invalid; network errors or
      // a temporarily unavailable API must not log the reader out.
      if (error?.response?.status === 401) {
        console.error('Session expired, logging out');
        setUser(null);
        setView('login');
      } else {
        console.error('Profile fetch failed, keeping session:', error?.message);
      }
    }
  }, [token]);

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    try {
      const [incoming, outgoing] = await Promise.all([
        notificationService.getNotifications(),
        userService.getSentRequests()
      ]);
      // Combine both for the UI to know all pending states
      setConnectionRequests([...incoming.data, ...outgoing.data]);
    } catch (error) {
      console.error('Failed to fetch requests:', error?.message);
    }
  }, [token]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [booksRes, quotesRes, missivesRes] = await Promise.all([
        bookService.getBooks(),
        quoteService.getQuotes(),
        missiveService.getMissives()
      ]);
      setBooks(booksRes.data);
      setQuotes(quotesRes.data);
      setReceivedQuotes(missivesRes.data);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
    fetchRequests();
    fetchData();

    // Refresh everything every 10 seconds to keep sender/receiver in sync
    const interval = setInterval(() => {
      fetchProfile();
      fetchRequests();
      fetchData();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchProfile, fetchRequests, fetchData]);

  // Persist the logged-in user (including the token) to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [user]);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setView('dashboard');
  };

  const handleSignupSuccess = () => {
    // Redirect to login after successful signup instead of dashboard
    setView('login');
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
  };

  if (view === 'dashboard') {
    return <Dashboard user={user} onLogout={handleLogout} books={books} setBooks={setBooks} quotes={quotes} setQuotes={setQuotes} receivedQuotes={receivedQuotes} setReceivedQuotes={setReceivedQuotes} connectionRequests={connectionRequests} setConnectionRequests={setConnectionRequests} fetchProfile={fetchProfile} />;
  }

  return (
    <div
      className="app-main"
      style={{
        backgroundImage: `linear-gradient(rgba(237, 232, 220, 0.2), rgba(209, 205, 194, 0.2)), url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <DustMotes count={10} />

      {/* Vignette + Header + Form */}
      <div className="library-overlay">
        <div className="header-container">
          <div className="candle-top" style={{ margin: '0 auto 20px' }} />
          <h1 className="auth-title">Nocturne Library</h1>
          <p className="auth-tagline">Where readers gather at midnight</p>
          <SectionRule className="auth-rule" />
          <div className="auth-est">EST. MDCCCXII</div>
        </div>

        {view === 'login' ? (
          <Login
            onToggle={() => setView('signup')}
            onLoginSuccess={handleLoginSuccess}
          />
        ) : (
          <Signup
            onToggle={() => setView('login')}
            onSignupSuccess={handleSignupSuccess}
          />
        )}
      </div>
    </div>
  );
}

export default App;
