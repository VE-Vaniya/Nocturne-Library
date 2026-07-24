import React, { useEffect, useState } from 'react';
import './Home.css';
import bookSpines from '../Images/BookSpines.png';
import SectionRule from '../common/SectionRule';
import DustMotes from '../common/DustMotes';

const Home = ({ onLogin, onSignup }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="home-root">
      {/* Book spines background */}
      <div
        className="home-bg"
        style={{ backgroundImage: `url(${bookSpines})` }}
      />
      {/* Dark overlay */}
      <div className="home-overlay" />

      <DustMotes count={12} />

      <div className={`home-content ${visible ? 'home-visible' : ''}`}>
        {/* Candle flame ornament */}
        <div className="home-candle" />

        <p className="home-est">EST. MDCCCXII</p>

        <h1 className="home-title">Nocturne Library</h1>

        <SectionRule className="home-rule" />

        <p className="home-tagline">
          A private sanctuary for the devoted reader.<br />
          Track your readings, collect luminous passages,<br />
          and connect with fellow bibliophiles who gather at midnight.
        </p>

        <div className="home-actions">
          <button className="home-btn home-btn--outline" onClick={onLogin}>
            Enter the Library
          </button>
          <button className="home-btn home-btn--ghost" onClick={onSignup}>
            Register
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
