import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import * as api from '../../services/api';
import Avatar from '../../components/ui/Avatar';
import RaysBackdrop from '../../components/ui/RaysBackdrop';
import { frameStyle, metaLine } from './frames';

const errMsg = (e, fallback) => e?.response?.data?.message || fallback;
const plural = (n) => `${n} ${n === 1 ? 'friend' : 'friends'}`;

/** A quote "held up to the light", with its share sheet and an in-place delete confirm. */
export default function QuoteOverlay({ quoteId, index }) {
  const { quotes, friends, closeModal, toast, refreshQuotes, go } = useApp();
  const quote = (quotes || []).find((q) => q._id === quoteId);
  const [view, setView] = useState('quote'); // 'quote' | 'share'
  const [confirming, setConfirming] = useState(false);
  const [picked, setPicked] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (!quote) return null;

  const toggle = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.concat(id)));

  const send = async () => {
    if (!picked.length || busy) return;
    setBusy(true);
    try {
      const r = await api.shareQuote({
        text: quote.text,
        author: quote.author,
        bookTitle: quote.bookTitle,
        page: quote.page,
        recipientIds: picked,
        message: message.trim() || undefined,
      });
      const sent = Number(r?.sent) || picked.length;
      closeModal();
      toast(`Sent to ${plural(sent)}`);
    } catch (e) {
      setBusy(false);
      toast(errMsg(e, 'The quote could not be sent'));
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.deleteQuote(quote._id);
      closeModal();
      await refreshQuotes();
      toast('Quote let go');
    } catch (e) {
      setBusy(false);
      toast(errMsg(e, 'Could not delete the quote'));
    }
  };

  if (view === 'share') {
    const list = friends || [];
    return (
      <div
        className="nl-pop qts-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Send to friends"
      >
        <div className="qts-sheet-head">
          <b>Send to</b>
          <button type="button" className="qts-back" onClick={() => setView('quote')}>
            Back
          </button>
        </div>
        <p className="qts-sheet-quote">“{quote.text}”</p>
        {list.length === 0 ? (
          <div className="qts-sheet-none">
            <p>No friends to send it to yet.</p>
            <button
              type="button"
              className="nl-ghost qts-pill"
              onClick={() => {
                closeModal();
                go('find');
              }}
            >
              Find readers
            </button>
          </div>
        ) : (
          <div className="qts-friends">
            {list.map((f) => {
              const on = picked.includes(f._id);
              const name = f.fullName || f.username || '';
              return (
                <button
                  key={f._id}
                  type="button"
                  className="qts-friend"
                  onClick={() => toggle(f._id)}
                  aria-pressed={on}
                >
                  <span className={on ? 'qts-av is-on' : 'qts-av'}>
                    <Avatar name={name} photo={f.avatar} size={58} />
                    {on && (
                      <span className="qts-check" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </span>
                  <span className="qts-first">{name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        )}
        <label htmlFor="qts-msg" className="qts-sr">
          Add a message
        </label>
        <textarea
          id="qts-msg"
          rows="2"
          className="qts-msg"
          placeholder="Add a message (optional)"
          value={message}
          maxLength={500}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          type="button"
          className="nl-btn qts-send"
          onClick={send}
          disabled={!picked.length || busy}
          style={{ background: picked.length ? '#c8a050' : '#6f6448' }}
        >
          {busy
            ? 'Sending…'
            : picked.length
              ? `Send to ${plural(picked.length)}`
              : 'Pick friends to send to'}
        </button>
      </div>
    );
  }

  return (
    <div className="qts-held">
      <RaysBackdrop intensity={1} />
      <div
        className="nl-pop qts-pop"
        role="dialog"
        aria-modal="true"
        aria-label="Quote"
        style={frameStyle(quote, index)}
      >
        <p className="qts-pop-text">“{quote.text}”</p>
        <p className="qts-pop-meta">{metaLine(quote, true)}</p>
      </div>
      {confirming ? (
        <div className="qts-confirm" role="alertdialog" aria-label="Delete this quote?">
          <span>Let this quote go? It cannot be brought back.</span>
          <span className="qts-actions">
            <button
              type="button"
              className="nl-ghost qts-pill qts-dim"
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              Keep it
            </button>
            <button type="button" className="qts-pill qts-danger" onClick={remove} disabled={busy}>
              Delete
            </button>
          </span>
        </div>
      ) : (
        <div className="qts-actions">
          <button
            type="button"
            className="nl-btn qts-pill qts-solid"
            onClick={() => setView('share')}
          >
            Send to friends
          </button>
          <button type="button" className="nl-ghost qts-pill qts-dim" onClick={closeModal}>
            Close
          </button>
          <button
            type="button"
            className="qts-pill qts-dim qts-del"
            onClick={() => setConfirming(true)}
            aria-label="Delete this quote"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
