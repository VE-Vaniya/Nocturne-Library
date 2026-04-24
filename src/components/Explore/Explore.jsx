import React, { useState, useEffect, useMemo } from 'react';
import { userService } from '../../services/api';
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

const Explore = ({ currentUser, connectionRequests, setConnectionRequests, fetchProfile }) => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await userService.getUsers();
        setUsers(response.data);
      } catch (error) {
        console.error("Failed to fetch scholars:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

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

  const handleSendRequest = async (targetUser) => {
    const targetId = targetUser._id;
    try {
      // Optimistically update local state
      if (setConnectionRequests) {
        setConnectionRequests(prev => [
          ...prev,
          { to: targetId, recipientId: targetId, from: currentUser._id, senderId: currentUser._id, status: 'pending' }
        ]);
      }
      await userService.connect(targetId);
      alert("Connection request sent.");
    } catch (error) {
      alert("Failed to send request.");
      // Rollback if needed
      if (setConnectionRequests) {
        setConnectionRequests(prev => prev.filter(r => (r.recipientId?._id || r.recipientId || r.to) !== targetId));
      }
    }
  };

  const handleCancelRequest = async (targetId) => {
    try {
      // Optimistically update
      if (setConnectionRequests) {
        setConnectionRequests(prev => prev.filter(req =>
          !(req.to === targetId || req.recipientId === targetId || req.recipientId?._id === targetId)
        ));
      }
      await userService.cancelConnect(targetId);
    } catch (error) {
      // Silently fail as the record might already be gone
      console.warn("Cancel request failed, possibly already removed.");
    }
  };

  const handleDisconnect = async (targetId) => {
    if (!window.confirm("Sever this scholarly bond?")) return;
    try {
      await userService.disconnect(targetId);
      // Refresh user profile to update local connections list
      if (fetchProfile) await fetchProfile();
    } catch (error) {
      console.error("Disconnect Error:", error);
    }
  };

  const hasRequested = (targetId) => {
    return connectionRequests.some(req =>
      (req.recipientId === targetId || req.recipientId?._id === targetId || req.to === targetId) &&
      (req.senderId === currentUser?._id || req.senderId?._id === currentUser?._id || req.from === currentUser?._id) &&
      req.status === 'pending'
    );
  };

  const isConnected = (targetId) => {
    return currentUser?.connections?.some(conn => {
      const connId = typeof conn === 'string' ? conn : conn._id;
      return connId === targetId;
    });
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
            const requestSent = hasRequested(profile._id);
            const connected = isConnected(profile._id);

            return (
              <div key={profile._id} className="explore-card-wrap">
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
                    {connected ? (
                      <button
                        className="action-btn-connect requested"
                        onClick={() => handleDisconnect(profile._id)}
                        title="Click to remove connection"
                      >
                        REMOVE CONNECTION
                      </button>
                    ) : (
                      <button
                        className={`action-btn-connect ${requestSent ? 'requested' : ''}`}
                        onClick={() => requestSent ? handleCancelRequest(profile._id) : handleSendRequest(profile)}
                        title={requestSent ? "Click to cancel request" : "Click to send connection request"}
                      >
                        {requestSent ? 'REQUEST SENT' : 'SEND CONNECTION REQUEST'}
                      </button>
                    )}
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
