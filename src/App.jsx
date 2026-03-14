import React, { useState } from 'react';
import Login from './components/Login/Login';
import Signup from './components/Signup/Signup';
import Dashboard from './components/Dashboard/Dashboard';
import './index.css';
import backgroundImage from './components/Images/Background.png';

function App() {
  const [view, setView]         = useState('login');   // 'login' | 'signup' | 'dashboard'
  const [user, setUser]         = useState(null);
  const [users, setUsers]       = useState([
    { email: 'librarian@nocturne.lib', password: 'password123', username: 'HeadLibrarian', fullName: 'Alistair Vane' },
    { email: 'scholar@nocturne.lib', password: 'password123', username: 'Scholar', fullName: 'Julian Vane' }
  ]);

  const handleLoginSuccess  = (loggedInUser) => {
    setUser(loggedInUser);
    setView('dashboard');
  };
  
  const handleSignupSuccess = (newUser) => {
    setUsers([...users, newUser]);
    setUser(newUser);
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
  };

  /* ── Dust motes (auth screens only) ── */
  const motes = Array.from({ length: 10 }).map((_, i) => ({
    id: i,
    left:     `${Math.random() * 100}%`,
    top:      `${Math.random() * 100}%`,
    size:     `${Math.random() * 3 + 1}px`,
    delay:    `${Math.random() * 5}s`,
    duration: `${Math.random() * 10 + 10}s`,
  }));

  if (view === 'dashboard') {
    return <Dashboard user={user} onLogout={handleLogout} />;
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
      {/* Dust Motes */}
      <div className="dust-motes">
        {motes.map((m) => (
          <div
            key={m.id}
            className="mote"
            style={{ left: m.left, top: m.top, width: m.size, height: m.size, animationDelay: m.delay, animationDuration: m.duration }}
          />
        ))}
      </div>

      {/* Vignette + Header + Form */}
      <div className="library-overlay">
        <div className="header-container">
          <div className="candle-top" style={{ margin: '0 auto 20px' }} />
          <h1 className="auth-title">Nocturne Library</h1>
          <p className="auth-tagline">Where readers gather at midnight</p>
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
