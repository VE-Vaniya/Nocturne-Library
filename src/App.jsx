import React, { useState, useEffect, useCallback } from 'react';
import { authService, notificationService, userService } from './services/api';
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

  const fetchProfile = useCallback(async () => {
    if (user && user.token) {
      try {
        const response = await authService.getProfile();
        setUser(prev => ({ ...prev, ...response.data }));
      } catch (error) {
        console.error("Session verification failed");
        setUser(null);
        localStorage.removeItem('nocturne_logged_in_user');
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

  useEffect(() => {
    fetchProfile();
    fetchRequests();

    // Refresh everything every 10 seconds to keep sender/receiver in sync
    const interval = setInterval(() => {
      fetchProfile();
      fetchRequests();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchProfile, fetchRequests]);

  const [books, setBooks] = useState(() => {
    const saved = localStorage.getItem('nocturne_books');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Crime and Punishment', author: 'Fyodor Dostoevsky', genre: 'Classic Fiction', status: 'currently reading', progress: '351 / 551', coverPreview: null }
    ];
  });

  const [quotes, setQuotes] = useState(() => {
    const saved = localStorage.getItem('nocturne_quotes');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) return parsed;
    }
    return [
      { id: 'q1', text: "Deep into that darkness peering, long I stood there wondering, fearing, Doubting, dreaming dreams no mortal ever dared to dream before.", author: "Edgar Allan Poe", bookTitle: "The Raven", pageNumber: "1" },
      { id: 'q2', text: "I am a forest, and a night of dark trees: but he who is not afraid of my darkness, will find banks full of roses under my cypresses.", author: "Friedrich Nietzsche", bookTitle: "Thus Spoke Zarathustra", pageNumber: "45" },
      { id: 'q3', text: "The oldest and strongest emotion of mankind is fear, and the oldest and strongest kind of fear is fear of the unknown.", author: "H.P. Lovecraft", bookTitle: "Supernatural Horror in Literature", pageNumber: "12" },
      { id: 'q4', text: "Whatever our souls are made of, his and mine are the same.", author: "Emily Brontë", bookTitle: "Wuthering Heights", pageNumber: "82" },
      { id: 'q5', text: "It is better to be hated for what you are than to be loved for what you are not.", author: "André Gide", bookTitle: "Autumn Leaves", pageNumber: "23" },
      { id: 'q6', text: "There are more things in Heaven and Earth, Horatio, than are dreamt of in your philosophy.", author: "William Shakespeare", bookTitle: "Hamlet", pageNumber: "156" }
    ];
  });

  const [receivedQuotes, setReceivedQuotes] = useState(() => {
    const saved = localStorage.getItem('nocturne_received_quotes');
    return saved ? JSON.parse(saved) : [
      { id: '101', text: "We cast a shadow on something wherever we stand", author: "E.M. Forster", sender: "Arthur Pym", bookTitle: "A Room with a View", pageNumber: "124" }
    ];
  });

  const [connectionRequests, setConnectionRequests] = useState([]);

  const [view, setView] = useState('login');

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

  React.useEffect(() => { localStorage.setItem('nocturne_books', JSON.stringify(books)); }, [books]);
  React.useEffect(() => { localStorage.setItem('nocturne_quotes', JSON.stringify(quotes)); }, [quotes]);
  React.useEffect(() => { localStorage.setItem('nocturne_received_quotes', JSON.stringify(receivedQuotes)); }, [receivedQuotes]);
  React.useEffect(() => { localStorage.setItem('nocturne_connection_requests', JSON.stringify(connectionRequests)); }, [connectionRequests]);

  // DEBUG: Track connection requests
  useEffect(() => {
    if (user) {
      console.log("Current User:", user.email);
      console.log("Current Requests:", connectionRequests);
    }
  }, [user, connectionRequests]);

  // Add dummy requests only if they don't exist at all for this user
  useEffect(() => {
    if (user && user.email) {
      const uEmail = user.email.toLowerCase();
      const hasXyz = connectionRequests.some(req => req.from === 'xyz@nocturne.lib' && req.to?.toLowerCase() === uEmail);
      const hasAbc = connectionRequests.some(req => req.from === 'abc@nocturne.lib' && req.to?.toLowerCase() === uEmail);
      const hasDemo = connectionRequests.some(req => req.from === 'seraphina@nocturne.lib' && req.to?.toLowerCase() === uEmail);

      const newReqs = [];
      if (!hasXyz) {
        newReqs.push({ from: 'xyz@nocturne.lib', fromName: 'XYZ User', fromRole: 'Avid Reader', to: user.email, status: 'pending' });
      }
      if (!hasAbc) {
        newReqs.push({ from: 'abc@nocturne.lib', fromName: 'Abigail Vanc', fromRole: 'Mystic Archivist', to: user.email, status: 'pending' });
      }
      if (!hasDemo) {
        newReqs.push({ from: 'seraphina@nocturne.lib', fromName: 'Seraphina Thorne', fromRole: 'Eldritch Researcher', to: user.email, status: 'pending' });
      }

      if (newReqs.length > 0) {
        setConnectionRequests(prev => [...prev, ...newReqs]);
      }
    }
  }, [user]); // Only run when user session starts

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
    setView('login');
  };

  if (view === 'dashboard') {
    return <Dashboard user={user} onLogout={handleLogout} books={books} setBooks={setBooks} quotes={quotes} setQuotes={setQuotes} receivedQuotes={receivedQuotes} setReceivedQuotes={setReceivedQuotes} users={users} setUsers={setUsers} connectionRequests={connectionRequests} setConnectionRequests={setConnectionRequests} fetchProfile={fetchProfile} />;
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
