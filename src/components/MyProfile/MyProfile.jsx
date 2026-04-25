import React, { useState, useEffect } from 'react';
import { authService, userService } from '../../services/api';
import './MyProfile.css';
import avatar1 from '../Images/Avatars/avatar1.png';
import avatar2 from '../Images/Avatars/avatar2.png';
import avatar3 from '../Images/Avatars/avatar3.png';
import avatar4 from '../Images/Avatars/avatar4.png';
import avatar5 from '../Images/Avatars/avatar5.png';

const avatars = [avatar1, avatar2, avatar3, avatar4, avatar5];

const MyProfile = ({ user, connectionRequests = [], setConnectionRequests, fetchProfile }) => {
  const [profile, setProfile] = useState({
    username: user?.username || 'Scholar',
    fullName: user?.fullName || 'Midnight Reader',
    email: user?.email || 'reader@nocturne.lib',
    avatarIndex: user?.avatar ? parseInt(user.avatar) : 0,
    rank: user?.email === 'librarian@nocturne.lib' ? 'Head Librarian' : 'Midnight Scholar',
    cardNumber: 'NL-' + Math.floor(Math.random() * 90000 + 10000)
  });

  const [activeTab, setActiveTab] = useState('card');
  const [localConnections, setLocalConnections] = useState([]);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [selectedAvatarTemp, setSelectedAvatarTemp] = useState(profile.avatarIndex);

  useEffect(() => {
    const accepted = (user?.connections || []).map(conn => ({
      ...conn,
      name: conn.fullName || conn.username,
      role: conn.email === 'librarian@nocturne.lib' ? 'Head Librarian' : 'Midnight Scholar',
      status: 'CONNECTED'
    }));
    setLocalConnections(accepted);
  }, [user?.connections]);

  const handleRemoveConnection = async (conn) => {
    const targetId = conn._id;
    if (!window.confirm(`Sever scholarly bond with ${conn.name}?`)) return;

    // Optimistically remove from local view instantly
    setLocalConnections(prev => prev.filter(c => c._id !== targetId));

    try {
      await userService.disconnect(targetId);
      if (fetchProfile) await fetchProfile();
    } catch (error) {
      console.error("Connection Error:", error);
      // Revert/Refresh if it fails
      if (fetchProfile) await fetchProfile();
    }
  };

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
        // Only update avatarIndex if it's different from current to avoid flickering/reset
        avatarIndex: user.avatar !== undefined && user.avatar !== null 
          ? parseInt(user.avatar) 
          : prev.avatarIndex,
        rank: user.email === 'librarian@nocturne.lib' ? 'Head Librarian' : 'Midnight Scholar'
      }));
    }
  }, [user]);

  const handleOpenAvatarEditor = () => {
    setSelectedAvatarTemp(profile.avatarIndex);
    setIsEditingAvatar(true);
  };

  const handleSaveAvatar = async () => {
    // Update locally first
    setProfile(prev => ({
      ...prev,
      avatarIndex: selectedAvatarTemp
    }));
    setIsEditingAvatar(false);

    try {
      await userService.updateAvatar(selectedAvatarTemp.toString());
      if (fetchProfile) await fetchProfile();
    } catch (error) {
      console.error("Failed to update avatar:", error);
      const errorMsg = error.response?.data?.message || error.message;
      alert(`Archive update failed: ${errorMsg}. Reverting portrait.`);
      setProfile(prev => ({
        ...prev,
        avatarIndex: user?.avatar ? parseInt(user.avatar) : 0
      }));
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = async () => {
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      alert("Please explicitly state current, new, and confirm keys.");
      return;
    }
    if (passwordForm.new.length < 6) {
      alert("Your new Vault Key must be at least 6 characters.");
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      alert("Your confirmation key does not match the new key.");
      return;
    }

    try {
      await authService.changePassword({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.new
      });
      alert("Security Vault parameters updated successfully.");
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error) {
      alert(error.response?.data?.message || "Password update failed. The vault remains locked.");
    }
  };

  return (
    <div className="profile-dashboard-view">
      <div className="profile-card-hub">

        {/* THE SCHOLAR CARD - Always the base on mobile */}
        {((activeTab === 'card' && window.innerWidth > 768) || (window.innerWidth <= 768 && activeTab === 'card')) && (
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
              <div className="card-serial">{profile.cardNumber}</div>
            </div>

            <div className="scholar-card-main">
              <div className="scholar-portrait-wrap">
                <img src={avatars[profile.avatarIndex]} alt="Scholar" className="scholar-portrait" />
                <button className="edit-portrait-btn" onClick={handleOpenAvatarEditor}>
                  EDIT PORTRAIT
                </button>
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

            {/* MOBILE ONLY NAVIGATION BUTTONS INSIDE CARD */}
            <div className="mobile-only-nav-group show-on-mobile">
              <button className="mobile-nav-item" onClick={() => setActiveTab('connections')}>
                <span className="nav-label">SCHOLARLY CONNECTIONS</span>
              </button>
              <button className="mobile-nav-item" onClick={() => setActiveTab('password')}>
                <span className="nav-label">SECURITY CREDENTIALS</span>
              </button>
            </div>

            <div className="scholar-card-footer hide-on-mobile">
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
          <div className="connections-ledger slide-in">
            <div className="mobile-back-header show-on-mobile">
              <button className="back-btn" onClick={() => setActiveTab('card')}>← BACK TO IDENTITY</button>
            </div>
            <h2 className="ledger-title">CONNECTIONS</h2>
            <div className="ledger-list">
              {localConnections.length > 0 ? (
                localConnections.map(c => (
                  <div key={c._id || c.email} className="ledger-item">
                    <div className="ledger-item-icon">{c.name ? c.name.charAt(0) : '?'}</div>
                    <div className="ledger-item-info">
                      <span className="ledger-item-name">{c.name}</span>
                      <span className="ledger-item-role">{c.role}</span>
                    </div>
                    <button className="ledger-remove" onClick={() => handleRemoveConnection(c)}>&times;</button>
                  </div>
                ))
              ) : (
                <div className="empty-ledger-message">
                  <p>Your scholarly network is currently empty.</p>
                  <p className="hint">Visit the Explore tab to find other seekers of knowledge.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECURITY SETTINGS */}
        {activeTab === 'password' && (
          <div className="security-vault-form slide-in">
            <div className="mobile-back-header show-on-mobile">
              <button className="back-btn" onClick={() => setActiveTab('card')}>← BACK TO IDENTITY</button>
            </div>
            <h2 className="ledger-title">SECURITY VAULT</h2>

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
              <button className="vault-submit" onClick={handlePasswordSubmit}>UPDATE KEY</button>
            </div>
          </div>
        )}

        {/* DESKTOP ONLY BOTTOM TABS */}
        <div className="profile-action-tabs hide-on-mobile">
          <button className={activeTab === 'card' ? 'active' : ''} onClick={() => setActiveTab('card')}>IDENTITY CARD</button>
          <button className={activeTab === 'connections' ? 'active' : ''} onClick={() => setActiveTab('connections')}>CONNECTIONS</button>
          <button className={activeTab === 'password' ? 'active' : ''} onClick={() => setActiveTab('password')}>SECURITY</button>
        </div>
      </div>
      {/* AVATAR SELECTION MODAL */}
      {isEditingAvatar && (
        <div className="avatar-modal-overlay">
          <div className="avatar-modal-card">
            <h2 className="ledger-title">SELECT PORTRAIT</h2>
            <div className="avatar-grid">
              {avatars.map((img, idx) => (
                <div 
                  key={idx} 
                  className={`avatar-option ${selectedAvatarTemp === idx ? 'selected' : ''}`}
                  onClick={() => setSelectedAvatarTemp(idx)}
                  onDoubleClick={handleSaveAvatar}
                >
                  <img src={img} alt={`Avatar ${idx + 1}`} />
                  {selectedAvatarTemp === idx && <div className="selected-check">✓</div>}
                </div>
              ))}
            </div>
            <div className="avatar-modal-actions">
              <button className="vault-submit cancel" onClick={() => setIsEditingAvatar(false)}>CANCEL</button>
              <button className="vault-submit" onClick={handleSaveAvatar}>SAVE PORTRAIT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;
