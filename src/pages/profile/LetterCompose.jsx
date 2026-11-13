import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import * as api from '../../services/api.js';
import Modal from '../../components/ui/Modal.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import Button from '../../components/ui/Button.jsx';
import FriendsModal from './FriendsModal.jsx';

const MAX = 2000;

/** Small compose sheet: write a letter to one friend (sendLetter). */
export default function LetterCompose({ friend }) {
  const { closeModal, openModal, toast, user } = useApp();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const name = friend.fullName || friend.username;
  const firstName = name.trim().split(/\s+/)[0];
  const me = (user?.fullName || user?.username || '').trim().split(/\s+/)[0];

  const send = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) {
      toast('Write a few lines first');
      return;
    }
    setBusy(true);
    try {
      await api.sendLetter({ recipientId: friend._id, body: text });
      closeModal();
      toast(`Letter sent to ${firstName}`);
    } catch (err) {
      toast(api.errorMessage(err, 'The letter could not be sent'));
      setBusy(false);
    }
  };

  return (
    <Modal as="form" label={`Letter to ${name}`} onSubmit={send} width="min(460px,92vw)">
      <div className="nl-panel__head">
        <span style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
          <Avatar src={friend.avatar} name={name} size={40} />
          <b className="nl-panel__title" style={{ overflowWrap: 'anywhere' }}>
            A letter to {firstName}
          </b>
        </span>
        <button type="button" className="nl-panel__x" aria-label="Close" onClick={closeModal}>
          ×
        </button>
      </div>
      <div className="nl-field">
        <label htmlFor="nl-letter-body">Dear {firstName},</label>
        <textarea
          id="nl-letter-body"
          className="nl-in nl-box"
          rows={6}
          maxLength={MAX}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What are you reading tonight?"
          style={{
            resize: 'none',
            fontFamily: "'IM Fell English',Georgia,serif",
            fontSize: 19,
            lineHeight: 1.4,
          }}
          data-autofocus
        />
        <span
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#8f8775',
            fontSize: 13,
          }}
        >
          <span style={{ fontFamily: "'La Belle Aurore',cursive", fontSize: 20, color: '#c9bd9f' }}>
            {me}
          </span>
          <span>
            {body.length}/{MAX}
          </span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Button
          variant="ghost"
          size="md"
          onClick={() => openModal(<FriendsModal />)}
          style={{ fontSize: 15, padding: '0 20px' }}
        >
          Back
        </Button>
        <Button type="submit" disabled={busy || !body.trim()} style={{ fontSize: 15 }}>
          {busy ? 'Sealing…' : 'Send letter'}
        </Button>
      </div>
    </Modal>
  );
}
