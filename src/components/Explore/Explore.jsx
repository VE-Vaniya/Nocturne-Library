import React, { useState, useMemo } from 'react';
import './Explore.css';
import '../MyProfile/MyProfile.css'; // Reuse card styles
import SearchBar from '../common/SearchBar';

import avatar1 from '../Images/Avatars/avatar1.png';
import avatar2 from '../Images/Avatars/avatar2.png';
import avatar3 from '../Images/Avatars/avatar3.png';
import avatar4 from '../Images/Avatars/avatar4.png';
import avatar5 from '../Images/Avatars/avatar5.png';

const avatars = [avatar1, avatar2, avatar3, avatar4, avatar5];

// A consistent pseudo-random choice for avatar and card number based on email
const getHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const Explore = ({ currentUser, users, connectionRequests, setConnectionRequests }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter out the logged-in user and any that don't match the search
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (u.email === currentUser?.email) return false;
      
      const searchLower = searchQuery.toLowerCase();
      const nameMatch = u.fullName?.toLowerCase().includes(searchLower) || false;
      const userMatch = u.username?.toLowerCase().includes(searchLower) || false;
      return nameMatch || userMatch;
    });
  }, [users, currentUser, searchQuery]);

  const handleSendRequest = (targetUser) => {
    if (!connectionRequests.find(req => req.to === targetUser.email && req.from === currentUser.email)) {
      setConnectionRequests([
        ...connectionRequests, 
        { 
          from: currentUser.email, 
          fromName: currentUser.fullName,
          fromRole: currentUser.email === 'librarian@nocturne.lib' ? 'Head Librarian' : 'Midnight Scholar',
          to: targetUser.email, 
          toName: targetUser.fullName,
          toRole: targetUser.email === 'librarian@nocturne.lib' ? 'Head Librarian' : 'Midnight Scholar',
          status: 'pending' 
        }
      ]);
    }
  };

  const handleCancelRequest = (targetEmail) => {
    setConnectionRequests(connectionRequests.filter(req => !(req.to === targetEmail && req.from === currentUser.email)));
  };

  const hasRequested = (targetEmail) => {
    return connectionRequests.some(req => req.to === targetEmail && req.from === currentUser?.email);
  };

  return (
    <div className="explore-dashboard-view">
      
      <div className="secondary-search-wrap">
        <SearchBar 
          placeholder="Search scholars by name or alias..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)}
          className="secondary-search-input"
        />
      </div>

      <div className="explore-grid">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((profile) => {
            const hash = getHash(profile.email);
            const avatarIndex = hash % avatars.length;
            const cardNumber = 'NL-' + (hash % 90000 + 10000);
            const rank = profile.email === 'librarian@nocturne.lib' ? 'Head Librarian' : 'Midnight Scholar';
            const requestSent = hasRequested(profile.email);

            return (
              <div key={profile.email} className="explore-card-wrap">
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
                    <div className="card-serial">{cardNumber}</div>
                  </div>

                  <div className="scholar-card-main">
                    <div className="scholar-portrait-wrap">
                      <img src={avatars[avatarIndex]} alt="Scholar" className="scholar-portrait" />
                    </div>

                    <div className="scholar-details">
                      <div className="detail-group">
                        <label>MEMBER NAME</label>
                        <div className="detail-field cursive">{profile.fullName || 'Unknown Scholar'}</div>
                      </div>
                      <div className="detail-group">
                        <label>REGISTRY NOM DE PLUME</label>
                        <div className="detail-field">@{profile.username || 'scholar'}</div>
                      </div>
                      <div className="detail-group">
                        <label>RANK & ARCHIVE CLEARANCE</label>
                        <div className="detail-field stamp-red">{rank.toUpperCase()}</div>
                      </div>
                    </div>
                  </div>

                  <div className="explore-card-actions">
                    <button 
                      className={`action-btn-connect ${requestSent ? 'requested' : ''}`}
                      onClick={() => !requestSent && handleSendRequest(profile)}
                      onDoubleClick={() => requestSent && handleCancelRequest(profile.email)}
                      title={requestSent ? "Double click to cancel request" : "Click to send connection request"}
                    >
                      {requestSent ? 'REQUEST SENT' : 'SEND CONNECTION REQUEST'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', width: '100%', padding: '3rem', color: 'var(--muted-text)', fontStyle: 'italic' }}>
            No scholars found matching your inquiry in the archives.
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
