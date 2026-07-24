import React, { useState, useEffect, useCallback } from 'react';
import { authService, notificationService, userService, bookService, quoteService, missiveService } from './services/api';
import Home from './components/Home/Home';
import Login from './components/Login/Login';
import Signup from './components/Signup/Signup';
import Dashboard from './components/Dashboard/Dashboard';
import './index.css';
import backgroundImage from './components/Images/Background.png';

import DustMotes from './components/common/DustMotes';
import SectionRule from './components/common/SectionRule';

function App() {
  const [users, setUsers] = useState(() => {
    const savedUsers = localStorage.getItem('nocturne_users');
    return savedUsers ? JSON.parse(savedUsers) : [
      { email: 'librarian@nocturne.lib', password: 'password123', username: 'HeadLibrarian', fullName: 'Alistair Vane' },
      { email: 'scholar@nocturne.lib', password: 'password123', username: 'Scholar', fullName: 'Julian Vane' }
    ];
  });

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('nocturne_logged_in_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useState(() => {
    const saved = localStorage.getItem('nocturne_logged_in_user');
    return saved ? 'dashboard' : 'home';
  });

  const fetchProfile = useCallback(async () => {
    if (user && user.token) {
      try {
        const response = await authService.getProfile();
        // Preserve the token — getProfile doesn't return it, so spreading
        // response.data would silently delete it from state
        setUser(prev => ({ ...prev, ...response.data, token: prev.token }));
      } catch (error) {
        // Only force logout on 401 (invalid/expired token), not on network errors
        if (error?.response?.status === 401) {
          console.error("Session expired, logging out");
          setUser(null);
          localStorage.removeItem('nocturne_logged_in_user');
          setView('login');
        } else {
          console.error("Profile fetch failed (network?), keeping session:", error.message);
        }
      }
    }
  }, [user?.token]);

  const fetchRequests = useCallback(async () => {
    if (user && user.token) {
      try {
        const [incoming, outgoing] = await Promise.all([
          notificationService.getNotifications(),
          userService.getSentRequests()
        ]);
        // Combine both for the UI to know all pending states
        setConnectionRequests([...incoming.data, ...outgoing.data]);
      } catch (error) {
        console.error("Failed to fetch requests");
      }
    }
  }, [user?.token]);

  const fetchData = useCallback(async () => {
    if (user && user.token) {
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
        console.error("Failed to fetch user data:", error);
      }
    }
  }, [user?.token]);

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
  }, [fetchProfile, fetchRequests]);

  const [books, setBooks] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [receivedQuotes, setReceivedQuotes] = useState([]);

  const [connectionRequests, setConnectionRequests] = useState([]);

  // view state declared above near user state so setView works in fetchProfile

  // Persist users and logged-in user to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('nocturne_users', JSON.stringify(users));
  }, [users]);

  React.useEffect(() => {
    if (user) {
      localStorage.setItem('nocturne_logged_in_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('nocturne_logged_in_user');
    }
  }, [user]);

  // LocalStorage persistance logic is removed for books/quotes since backend handles it

  // DEBUG: Track connection requests
  useEffect(() => {
    if (user) {
      console.log("Current User:", user.email);
      console.log("Current Requests:", connectionRequests);
    }
  }, [user, connectionRequests]);

  // Dummy requests logic removed to rely entirely on backend


  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setView('dashboard');
  };

  const handleSignupSuccess = (newUser) => {
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    // Redirect to login after successful signup instead of dashboard
    setView('login');
  };

  const handleLogout = () => {
    setUser(null);
    setView('home');
  };

  if (view === 'dashboard') {
    return <Dashboard user={user} onLogout={handleLogout} books={books} setBooks={setBooks} quotes={quotes} setQuotes={setQuotes} receivedQuotes={receivedQuotes} setReceivedQuotes={setReceivedQuotes} users={users} setUsers={setUsers} connectionRequests={connectionRequests} setConnectionRequests={setConnectionRequests} fetchProfile={fetchProfile} />;
  }

  if (view === 'home') {
    return <Home onLogin={() => setView('login')} onSignup={() => setView('signup')} />;
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

        {/* Back to home link */}
        <button
          onClick={() => setView('home')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '0.85rem',
            color: '#a09787', letterSpacing: '1px', textTransform: 'uppercase',
            marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#c4b69c'}
          onMouseLeave={e => e.currentTarget.style.color = '#a09787'}
        >
          ← Home
        </button>

        {view === 'login' ? (
          <Login
            onToggle={() => setView('signup')}
            onLoginSuccess={handleLoginSuccess}
            users={users}
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
