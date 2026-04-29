import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/api';
import './Notifications.css';

const IconMail = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const IconBook = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M4 19V5a2 2 0 012-2h13a1 1 0 011 1v14M4 19a2 2 0 002 2h13M4 19a2 2 0 002-2" />
  </svg>
);

const IconStar = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const Notifications = ({ isOpen, onClose, connectionRequests = [], setConnectionRequests, user, fetchProfile }) => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "New Book Arrived",
      message: "The Great Gatsby is now available in the Classics section. It features a stunning new cover design and an introduction by renowned scholars. Add it to your reading list to explore the jazz age of luxury and longing.",
      time: "2 mins ago",
      icon: <IconBook />,
      unread: true
    },
    {
      id: 2,
      title: "Reading Goal Achieved",
      message: "Congratulations! You've completed 500 pages this week. This puts you in the top 5% of readers this month. Keep up this magnificent pace to unlock the Midnight Scholar achievement badge.",
      time: "1 hour ago",
      icon: <IconStar />,
      unread: true
    },
    {
      id: 3,
      title: "Librarian's Note",
      message: "Please remember to return 'Moby Dick' by Friday. Another reader has requested the volume. If you need more time, please visit the central desk to request a renewal before the deadline.",
      time: "3 hours ago",
      icon: <IconMail />,
      unread: false
    },
    {
      id: 4,
      title: "System Update",
      message: "New fonts inspired by 19th-century manuscripts were added to the interface. We've also optimized the transition speeds for a smoother browsing experience across the library's digital archives.",
      time: "Yesterday",
      icon: <IconMail />,
      unread: false
    }
  ]);

  const [selectedNotif, setSelectedNotif] = useState(null);

  const pendingRequests = connectionRequests.filter(notif => 
    notif.type === 'connection_request' && 
    notif.status === 'pending' &&
    // Only show INCOMING requests in this panel
    (notif.senderId?._id !== user?._id && notif.senderId !== user?._id)
  );

  const handleAccept = async (notifId) => {
    try {
      await notificationService.respond(notifId, 'accepted');
      setConnectionRequests(connectionRequests.map(n => 
        n._id === notifId ? { ...n, status: 'accepted' } : n
      ));
      if (fetchProfile) await fetchProfile();
      alert("Connection request accepted!");
    } catch (error) {
      alert("Failed to accept request.");
    }
  };

  const handleDecline = async (notifId) => {
    try {
      await notificationService.respond(notifId, 'rejected');
      setConnectionRequests(connectionRequests.filter(n => n._id !== notifId));
    } catch (error) {
      alert("Failed to decline request.");
    }
  };


  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const handleNotifClick = (notif) => {
    setSelectedNotif(notif);
    // Also mark this specific one as read when clicked
    setNotifications(notifications.map(n =>
      n.id === notif.id ? { ...n, unread: false } : n
    ));
  };

  return (
    <>
      <div className={`notif-panel-overlay ${isOpen || selectedNotif ? 'active' : ''}`} onClick={() => {
        if (selectedNotif) setSelectedNotif(null);
        else onClose();
      }} />

      <div className={`notif-panel ${isOpen ? 'open' : ''}`}>
        <div className="notif-panel-header">
          <h3>Notifications</h3>
          <button className="notif-close-btn" onClick={onClose}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="notif-list">
          {/* Scholarly Requests Section */}
          {pendingRequests.length > 0 && (
            <div className="notif-section">
              <div className="notif-section-header">SCHOLARLY REQUESTS</div>
              {pendingRequests.map(req => (
                <div key={req._id} className="notif-item request-item" style={{ cursor: 'default' }}>
                  <div className="notif-icon-wrap" style={{ background: 'rgba(196, 165, 114, 0.2)' }}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" />
                    </svg>
                  </div>
                  <div className="notif-content">
                    <div className="notif-title-row">
                      <span className="notif-title">{req.senderId?.fullName || 'Fellow Scholar'}</span>
                      <span className="notif-time">@{req.senderId?.username || 'scholar'}</span>
                    </div>
                    <p className="notif-message-preview">{req.message}</p>
                    <div className="request-actions" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button className="req-btn accept" onClick={() => handleAccept(req._id)}>ACCEPT</button>
                      <button className="req-btn decline" onClick={() => handleDecline(req._id)}>REJECT</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="notif-section-header" style={{ marginTop: '1rem' }}>ALERTS & UPDATES</div>
          {notifications.map(notif => (
            <div key={notif.id} className={`notif-item ${notif.unread ? 'unread' : ''}`} onClick={() => handleNotifClick(notif)}>
              <div className="notif-icon-wrap">
                {notif.icon}
              </div>
              <div className="notif-content">
                <div className="notif-title-row">
                  <span className="notif-title">{notif.title}</span>
                  <span className="notif-time">{notif.time}</span>
                </div>
                <p className="notif-message-preview">{notif.message.substring(0, 60)}...</p>
              </div>
              {notif.unread && <div className="unread-dot" />}
            </div>
          ))}
        </div>

        <button className="mark-read-btn" onClick={handleMarkAllRead}>MARK ALL AS READ</button>
      </div>

      {/* Expanded Notification Modal */}
      {selectedNotif && (
        <div className="notif-modal">
          <div className="notif-modal-card">
            <button className="modal-close-btn" onClick={() => setSelectedNotif(null)}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <div className="modal-icon-header">
              <div className="modal-icon-wrap">
                {selectedNotif.icon}
              </div>
            </div>
            <h2 className="modal-title">{selectedNotif.title}</h2>
            <div className="modal-time">{selectedNotif.time}</div>
            <div className="modal-divider">
              <span className="line"></span>
              <span className="diamond"></span>
              <span className="line"></span>
            </div>
            <p className="modal-body">{selectedNotif.message}</p>
            <button className="modal-action-btn" onClick={() => setSelectedNotif(null)}>
              ACKNOWLEDGE
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Notifications;
