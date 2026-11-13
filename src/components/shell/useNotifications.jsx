import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import * as api from '../../services/api.js';
import Avatar from '../ui/Avatar.jsx';
import Button from '../ui/Button.jsx';
import NoteLetter from './NoteLetter.jsx';
import { relTime } from './time.js';

const WHAT = {
  letter: 'sent you a letter',
  quote_shared: 'sent you a quote',
  connection_request: 'wants to be friends',
  request_accepted: 'accepted your friend request',
};

/** Hook: returns { bell, panel } — the bell button (goes in the header) and the dropdown (sibling of the header). */
export default function useNotifications() {
  const { notifications, refreshNotifications, refreshFriends, refreshStats, openModal, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState(() => new Set());
  const [answers, setAnswers] = useState({});
  const panelRef = useRef(null);
  const bellRef = useRef(null);

  const isRead = (n) => n.read || readIds.has(n._id);
  const unread = notifications.filter((n) => !isRead(n)).length;

  useEffect(() => {
    if (!open) return undefined;
    const el = panelRef.current;
    if (el) el.focus();
    return undefined;
  }, [open]);

  const close = () => {
    setOpen(false);
    if (bellRef.current) bellRef.current.focus();
  };

  const markLocal = (id) => setReadIds((s) => new Set(s).add(id));
  const markOne = (n) => {
    if (isRead(n)) return;
    markLocal(n._id);
    api.markRead(n._id).catch(() => {});
  };

  const openNote = (n) => {
    markOne(n);
    if (n.type === 'letter' || n.type === 'quote_shared') {
      setOpen(false);
      openModal(<NoteLetter n={n} />, { onClose: () => refreshNotifications() });
    }
  };

  const markAll = async () => {
    setReadIds(new Set(notifications.map((n) => n._id)));
    try {
      await api.markAllRead();
      refreshNotifications();
    } catch {
      // local state already shows them as read; the next poll reconciles
    }
  };

  const answer = async (n, status) => {
    setAnswers((a) => ({ ...a, [n._id]: status }));
    markLocal(n._id);
    try {
      await api.respond(n._id, status);
      if (status === 'accepted') {
        refreshFriends();
        refreshStats();
      }
      refreshNotifications();
    } catch (err) {
      setAnswers((a) => {
        const next = { ...a };
        delete next[n._id];
        return next;
      });
      toast(api.errorMessage(err, 'Could not answer that request'));
    }
  };

  const bell = (
    <button
      ref={bellRef}
      type="button"
      className="nl-bell nl-corner nl-corner-l"
      onClick={() => setOpen((o) => !o)}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={`Notifications, ${unread} new`}
      aria-expanded={open}
      aria-haspopup="dialog"
    >
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />
      </svg>
      {unread > 0 ? <span className="nl-badge">{unread > 99 ? '99+' : unread}</span> : null}
    </button>
  );

  const panel = open ? (
    <>
      <button type="button" className="nl-notif-scrim" aria-label="Close notifications" tabIndex={-1} onClick={close} />
      <div
        ref={panelRef}
        className="nl-drop nl-notif"
        role="dialog"
        aria-label="Notifications"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            close();
          }
        }}
      >
        <div className="nl-notif__head">
          <b className="nl-notif__title">Notifications</b>
          <button type="button" className="nl-notif__all" onClick={markAll} disabled={!unread}>
            Mark all read
          </button>
        </div>
        {notifications.length === 0 ? <p className="nl-notif__empty">No letters tonight. All is quiet.</p> : null}
        {notifications.map((n) => {
          const read = isRead(n);
          const isReq = n.type === 'connection_request';
          const st = answers[n._id] || (n.status === 'accepted' || n.status === 'rejected' ? n.status : null);
          const name = n.from?.fullName || n.from?.username || 'Someone';
          return (
            <div key={n._id} className="nl-notif__item">
              <button type="button" className="nl-row nl-notif__row" onClick={() => openNote(n)}>
                <Avatar src={n.from?.avatar} name={name} size={40} />
                <span style={{ minWidth: 0 }}>
                  <b style={{ fontWeight: read ? 400 : 600 }}>{name}</b> <span className="nl-notif__what">{WHAT[n.type] || 'sent you something'}</span>
                  <br />
                  <span className="nl-notif__when">{relTime(n.createdAt)}</span>
                </span>
                <span className="nl-notif__dot" style={{ background: read ? 'transparent' : '#e9c779' }} aria-label={read ? undefined : 'unread'} />
              </button>
              {isReq ? (
                <div className="nl-notif__actions">
                  {!st ? (
                    <>
                      <Button size="sm" onClick={() => answer(n, 'accepted')} style={{ fontWeight: 400 }}>
                        Accept
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => answer(n, 'rejected')} style={{ borderColor: 'rgba(200,160,80,.4)' }}>
                        Decline
                      </Button>
                    </>
                  ) : (
                    <span className="nl-notif__answer" role="status">
                      {st === 'accepted' ? 'You are now friends.' : 'Request declined.'}
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  ) : null;

  return { bell, panel };
}
