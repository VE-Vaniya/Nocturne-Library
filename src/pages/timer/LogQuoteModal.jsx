import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import * as api from '../../services/api';

/** "✎ Log a quote" mid-sitting, on a slip of paper. The timer keeps running behind it. */
export default function LogQuoteModal({ book, onSaved }) {
  const { refreshQuotes, closeModal, toast } = useApp();
  const [text, setText] = useState('');
  const [page, setPage] = useState(book?.lastPageRead ? String(book.lastPageRead) : '');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) {
      toast('Write the line first');
      return;
    }
    setBusy(true);
    try {
      await api.addQuote({
        text: t,
        author: book ? book.author : author.trim(),
        bookTitle: book ? book.title : title.trim(),
        page: page.trim(),
        bookId: book ? book._id : undefined,
      });
      onSaved?.();
      closeModal();
      toast('Saved to your quotes');
      refreshQuotes();
    } catch (err) {
      setBusy(false);
      toast(err?.response?.data?.message || 'The quote could not be saved');
    }
  };

  return (
    <form
      className="nl-pop tmr-log"
      role="dialog"
      aria-modal="true"
      aria-label="Log a quote"
      onSubmit={save}
    >
      <b className="tmr-log-title">{book ? `A line from ${book.title}` : 'A line worth keeping'}</b>
      <label htmlFor="tmr-line" className="tmr-log-label">
        The quote
      </label>
      <textarea
        id="tmr-line"
        rows="3"
        className="tmr-log-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      {!book && (
        <div className="tmr-log-row">
          <label htmlFor="tmr-lbook" className="tmr-log-label">
            Book
          </label>
          <input
            id="tmr-lbook"
            className="tmr-log-in tmr-log-wide"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label htmlFor="tmr-lauthor" className="tmr-log-label">
            Author
          </label>
          <input
            id="tmr-lauthor"
            className="tmr-log-in tmr-log-wide"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>
      )}
      <div className="tmr-log-row">
        <label htmlFor="tmr-pg" className="tmr-log-label">
          Page
        </label>
        <input
          id="tmr-pg"
          className="tmr-log-in"
          value={page}
          inputMode="numeric"
          onChange={(e) => setPage(e.target.value)}
        />
      </div>
      <div className="tmr-log-foot">
        <button type="button" className="tmr-log-cancel" onClick={closeModal}>
          Cancel
        </button>
        <button type="submit" className="tmr-log-save" disabled={busy}>
          {busy ? 'Saving…' : 'Save to my quotes'}
        </button>
      </div>
      <p className="tmr-log-note">The timer keeps running while you write.</p>
    </form>
  );
}
