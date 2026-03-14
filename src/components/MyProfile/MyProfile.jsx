import React, { useState, useEffect } from 'react';
import './MyProfile.css';
import avatar1 from '../Images/Avatars/avatar1.png';
import avatar2 from '../Images/Avatars/avatar2.png';
import avatar3 from '../Images/Avatars/avatar3.png';
import avatar4 from '../Images/Avatars/avatar4.png';
import avatar5 from '../Images/Avatars/avatar5.png';

const avatars = [avatar1, avatar2, avatar3, avatar4, avatar5];

const MyProfile = ({ user }) => {
  const [profile, setProfile] = useState({
    username: user?.username || 'Scholar',
    fullName: user?.fullName || 'Midnight Reader',
    email: user?.email || 'reader@nocturne.lib',
    avatarIndex: 0,
    rank: user?.email === 'librarian@nocturne.lib' ? 'Head Librarian' : 'Midnight Scholar',
    cardNumber: 'NL-' + Math.floor(Math.random() * 90000 + 10000)
  });

  const [activeTab, setActiveTab] = useState('card');
  const [connections, setConnections] = useState([
    { id: 1, name: 'Eleanor Vance', role: 'Chief Archivist', status: 'CONNECTED' },
    { id: 2, name: 'Arthur Pym', role: 'Field Researcher', status: 'CONNECTED' },
    { id: 3, name: 'Lenore Raven', role: 'Lyrical Poet', status: 'CONNECTED' },
    { id: 4, name: 'Roderick Usher', role: 'Musical Surgeon', status: 'CONNECTED' },
    { id: 5, name: 'Beatrix Thorne', role: 'Botanist', status: 'CONNECTED' }
  ]);

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  useEffect(() => {
    if (user) {
      setProfile(prev => ({
        ...prev,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        rank: user.email === 'librarian@nocturne.lib' ? 'Head Librarian' : 'Midnight Scholar'
      }));
    }
  }, [user]);

  const handleDoubleClickAvatar = () => {
    setProfile(prev => ({
      ...prev,
      avatarIndex: (prev.avatarIndex + 1) % avatars.length
    }));
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  return (
    <div className="profile-dashboard-view">
      <div className="profile-card-hub">
        
        {/* THE SCHOLAR CARD */}
        {activeTab === 'card' && (
          <div className="scholar-identity-card">
            <div className="card-ornament top-left"></div>
            <div className="card-ornament top-right"></div>
            <div className="card-ornament bottom-left"></div>
            <div className="card-ornament bottom-right"></div>

            <div className="scholar-card-top">
              <div className="library-seal">
                <span className="seal-text">NOCTURNE</span>
                <span className="seal-year">EST. 1892</span>
              </div>
              <div className="brown-notary-seal">
                <span className="seal-icon">🕮</span>
                <span className="seal-text">CURATORIAL REGISTER</span>
              </div>
              <div className="card-serial">{profile.cardNumber}</div>
            </div>

            <div className="scholar-card-main">
              <div className="scholar-portrait-wrap" onDoubleClick={handleDoubleClickAvatar} title="Double-click to cycle portrait">
                <img src={avatars[profile.avatarIndex]} alt="Scholar" className="scholar-portrait" />
                <div className="portrait-hint">DBL CLICK TO CHANGE</div>
              </div>

              <div className="scholar-details">
                <div className="detail-group">
                  <label>MEMBER NAME</label>
                  <div className="detail-field cursive">{profile.fullName}</div>
                </div>
                <div className="detail-group">
                  <label>REGISTRY NOM DE PLUME</label>
                  <div className="detail-field">@{profile.username}</div>
                </div>
                <div className="detail-group">
                  <label>CORRESPONDENCE EMAIL</label>
                  <div className="detail-field">{profile.email}</div>
                </div>
                <div className="detail-group">
                  <label>RANK & ARCHIVE CLEARANCE</label>
                  <div className="detail-field stamp-red">{profile.rank.toUpperCase()}</div>
                </div>
              </div>
            </div>

            <div className="scholar-card-footer">
              <p>THIS DOCUMENT CERTIFIES THE HOLDER AS A MEMBER IN GOOD STANDING OF THE NOCTURNE ARCHIVES.</p>
              <div className="official-library-seal">
                <div className="seal-inner">
                  <span className="seal-crown">♛</span>
                  <span className="seal-dept">ARCHIVAL DEPT.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONNECTIONS LIST */}
        {activeTab === 'connections' && (
          <div className="connections-ledger">
            <h2 className="ledger-title">SCHOLARLY CONNECTIONS</h2>
            <div className="ledger-list">
              {connections.map(c => (
                <div key={c.id} className="ledger-item">
                  <div className="ledger-item-icon">{c.name.charAt(0)}</div>
                  <div className="ledger-item-info">
                    <span className="ledger-item-name">{c.name}</span>
                    <span className="ledger-item-role">{c.role}</span>
                  </div>
                  <div className="ledger-item-status">CONNECTED</div>
                  <button className="ledger-remove" onClick={() => setConnections(connections.filter(conn => conn.id !== c.id))}>&times;</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECURITY SETTINGS */}
        {activeTab === 'password' && (
          <div className="security-vault-form">
            <h2 className="ledger-title">SECURITY CREDENTIALS</h2>
            
            <div className="security-content-split">
              <div className="vault-fields">
                <div className="vault-group">
                  <label>CURRENT PASSWORD</label>
                  <input type="password" name="current" placeholder="••••••••" value={passwordForm.current} onChange={handlePasswordChange} />
                </div>
                <div className="vault-group">
                  <label>NEW PASSWORD</label>
                  <input type="password" name="new" placeholder="••••••••" value={passwordForm.new} onChange={handlePasswordChange} />
                </div>
                <div className="vault-group">
                  <label>CONFIRM NEW PASSWORD</label>
                  <input type="password" name="confirm" placeholder="••••••••" value={passwordForm.confirm} onChange={handlePasswordChange} />
                </div>
                <button className="vault-submit">UPDATE SECURE KEY</button>
              </div>

              <div className="security-decoration">
                <div className="notary-seal-gold">
                  <div className="seal-ring">
                    <span className="seal-icon">❈</span>
                  </div>
                  <span className="seal-label">SECRETUM</span>
                </div>
                <div className="security-notes">
                  <p className="note-text">"Knowledge is a vault; the key is your own."</p>
                  <div className="note-rule"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM DASHBOARD TABS */}
        <div className="profile-action-tabs">
          <button className={activeTab === 'card' ? 'active' : ''} onClick={() => setActiveTab('card')}>IDENTITY CARD</button>
          <button className={activeTab === 'connections' ? 'active' : ''} onClick={() => setActiveTab('connections')}>CONNECTIONS</button>
          <button className={activeTab === 'password' ? 'active' : ''} onClick={() => setActiveTab('password')}>SECURITY</button>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
