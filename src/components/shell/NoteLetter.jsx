import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import * as api from '../../services/api.js';
import Letter from './Letter.jsx';

const first = (p) => ((p?.fullName || p?.username || 'A friend').trim().split(/\s+/)[0]);

/** Modal body for a letter / shared-quote notification. */
export default function NoteLetter({ n }) {
  const { user, closeModal, toast, refreshQuotes, refreshStats } = useApp();
  const m = n.missive || {};
  const [saved, setSaved] = useState(!!m.saved);
  const [busy, setBusy] = useState(false);
  const isQuote = n.type === 'quote_shared';
  const me = first(user);
  const save = async () => {
    if (saved || busy) return;
    setBusy(true);
    try {
      await api.saveMissive(m._id);
      setSaved(true);
      toast('Saved to your quotes');
      refreshQuotes();
      refreshStats();
    } catch (err) {
      toast(api.errorMessage(err, 'Could not save that quote'));
    } finally {
      setBusy(false);
    }
  };
  const source = isQuote ? [m.author, m.bookTitle].filter(Boolean).join(', ') + (m.page ? ` · ${String(m.page).match(/^\d+$/) ? `p. ${m.page}` : m.page}` : '') : '';
  return (
    <Letter
      from={n.from?.fullName || n.from?.username || 'a friend'}
      salute={isQuote ? m.message || 'Read this and thought of you —' : `Dear ${me},`}
      body={isQuote ? `“${m.text || ''}”` : m.body || m.text || ''}
      source={source}
      sign={first(n.from)}
      onSave={isQuote ? save : undefined}
      saveLabel={saved ? 'Saved ✓' : 'Save to my quotes'}
      saveDisabled={busy}
      onClose={closeModal}
    />
  );
}
