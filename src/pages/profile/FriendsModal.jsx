import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import * as api from '../../services/api.js';
import Modal from '../../components/ui/Modal.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import Button from '../../components/ui/Button.jsx';
import ScrollArea from '../../components/ui/ScrollArea.jsx';
import LetterCompose from './LetterCompose.jsx';

/**
 * Friends list. "Remove" is soft until the modal closes, so "Undo" can take it back
 * (the prototype's Remove/Undo toggle); the actual removeFriend calls run on close.
 */
export default function FriendsModal() {
  const { friends, refreshFriends, refreshStats, openModal, closeModal, go, toast } = useApp();
  const [q, setQ] = useState('');
  const [removed, setRemoved] = useState([]);
  const removedRef = useRef(removed);
  useEffect(() => {
    removedRef.current = removed;
  }, [removed]);

  // commit pending removals when the modal goes away
  useEffect(
    () => () => {
      const ids = removedRef.current;
      if (!ids.length) return;
      Promise.allSettled(ids.map((id) => api.removeFriend(id))).then((res) => {
        const failed = res.filter((r) => r.status === 'rejected').length;
        if (failed) toast(failed === 1 ? 'Could not remove one friend' : `Could not remove ${failed} friends`);
        refreshFriends();
        refreshStats();
      });
    },
    [refreshFriends, refreshStats, toast],
  );

  const qq = q.trim().toLowerCase();
  const rows = friends.filter((f) => !qq || `${f.fullName || ''} ${f.username || ''}`.toLowerCase().includes(qq));
  const count = friends.filter((f) => !removed.includes(f._id)).length;

  const toggle = (id) => setRemoved((r) => (r.includes(id) ? r.filter((x) => x !== id) : r.concat(id)));

  const reading = (f) => {
    const c = f.currentlyReading;
    const title = typeof c === 'string' ? c : c?.title;
    return title ? `reading ${title}` : 'reading something good';
  };

  return (
    <Modal
      label="Friends"
      title={`Friends · ${count}`}
      variant="flush"
      width="min(440px,92vw)"
      style={{ maxHeight: '78vh', display: 'grid', gridTemplateRows: 'auto auto minmax(0,1fr)' }}
    >
      <div style={{ padding: '0 18px 10px' }}>
        <label htmlFor="nl-fq" className="nl-sr">
          Search friends
        </label>
        <input
          id="nl-fq"
          className="nl-in nl-box"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search friends"
          autoComplete="off"
          data-autofocus
        />
      </div>
      <ScrollArea style={{ padding: '0 8px 12px' }}>
        {friends.length === 0 ? (
          <div style={{ padding: '18px 10px 10px', textAlign: 'center', display: 'grid', gap: 12, justifyItems: 'center' }}>
            <p style={{ margin: 0, color: '#a89f88', fontStyle: 'italic' }}>No reading friends yet.</p>
            <Button
              size="sm"
              onClick={() => {
                closeModal();
                go('find');
              }}
            >
              Find readers
            </Button>
          </div>
        ) : null}
        {friends.length > 0 && rows.length === 0 ? (
          <p style={{ margin: 0, padding: '14px 10px', color: '#8f8775', fontStyle: 'italic' }}>No friend by that name.</p>
        ) : null}
        {rows.map((f) => {
          const gone = removed.includes(f._id);
          const name = f.fullName || f.username;
          return (
            <div
              key={f._id}
              className="nl-row"
              style={{ display: 'grid', gridTemplateColumns: '48px minmax(0,1fr) auto', gap: 12, alignItems: 'center', padding: 10, borderRadius: 10 }}
            >
              <Avatar src={f.avatar} name={name} size={48} ring={gone ? 'transparent' : 'rgba(200,160,80,.5)'} style={{ opacity: gone ? 0.5 : 1 }} />
              <span style={{ minWidth: 0, textAlign: 'left' }}>
                <b style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{name}</b>
                <br />
                <span style={{ color: '#a89f88', fontSize: 14 }}>{gone ? 'removed from friends' : reading(f)}</span>
              </span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="nl-ghost"
                  disabled={gone}
                  onClick={() => openModal(<LetterCompose friend={f} />)}
                  aria-label={`Write a letter to ${name}`}
                  style={{
                    minHeight: 34,
                    padding: '0 12px',
                    border: '1px solid rgba(200,160,80,.4)',
                    borderRadius: 8,
                    background: 'none',
                    color: '#e8dcc0',
                    fontSize: 14,
                    cursor: gone ? 'default' : 'pointer',
                    opacity: gone ? 0.4 : 1,
                  }}
                >
                  Letter
                </button>
                <button
                  type="button"
                  onClick={() => toggle(f._id)}
                  aria-label={gone ? `Undo removing ${name}` : `Remove ${name}`}
                  style={{ minHeight: 34, padding: '0 10px', border: 0, borderRadius: 8, background: '#1e2924', color: '#a89f88', fontSize: 14, cursor: 'pointer' }}
                >
                  {gone ? 'Undo' : 'Remove'}
                </button>
              </span>
            </div>
          );
        })}
      </ScrollArea>
    </Modal>
  );
}
