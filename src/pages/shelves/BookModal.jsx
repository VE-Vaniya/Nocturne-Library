import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import * as api from '../../services/api';
import Segmented from '../../components/ui/Segmented';
import { clothFor } from '../../components/ui/bookStyle';
import { STATUS_OPTIONS, TIMER_BOOK_KEY, noteFor, pageLabel, quotesForBook } from './shelfData';

const errMsg = (e, fallback) => e?.response?.data?.message || fallback;

/** Book details card opened from a spine or list row. Reads live data from context. */
export default function BookModal({ bookId }) {
  const { books, quotes, refreshBooks, closeModal, go, toast } = useApp();
  const book = (books || []).find((b) => b._id === bookId);
  const [status, setStatus] = useState(book?.status || 'wishlist');
  const [page, setPage] = useState(String(book?.lastPageRead || ''));
  const [total, setTotal] = useState(String(book?.totalPages || ''));
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!book) return null;

  const cloth = clothFor(book.title);
  const kept = quotesForBook(quotes, book);
  const pageN = Math.max(0, parseInt(page, 10) || 0);
  const totalN = Math.max(0, parseInt(total, 10) || 0);
  const dirty =
    pageN !== (Number(book.lastPageRead) || 0) || totalN !== (Number(book.totalPages) || 0);
  const pct = totalN ? Math.min(100, Math.round((pageN / totalN) * 100)) : 0;

  const changeStatus = async (next) => {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    try {
      await api.updateBook(book._id, { status: next });
      await refreshBooks();
      toast(`Moved to ${STATUS_OPTIONS.find((o) => o.value === next)?.label || next}`);
    } catch (e) {
      setStatus(prev);
      toast(errMsg(e, 'Could not move the book'));
    }
  };

  const saveProgress = async () => {
    if (totalN && pageN > totalN) {
      toast('The page is past the last page');
      return;
    }
    setBusy(true);
    try {
      await api.updateBook(book._id, { lastPageRead: pageN, totalPages: totalN || undefined });
      await refreshBooks();
      toast('Progress saved');
    } catch (e) {
      toast(errMsg(e, 'Could not save progress'));
    } finally {
      setBusy(false);
    }
  };

  const readNow = () => {
    try {
      sessionStorage.setItem(TIMER_BOOK_KEY, book._id);
    } catch {
      /* storage unavailable: the timer falls back to the current book */
    }
    closeModal();
    go('timer');
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.deleteBook(book._id);
      closeModal();
      await refreshBooks();
      toast(`${book.title} removed from your shelves`);
    } catch (e) {
      setBusy(false);
      toast(errMsg(e, 'Could not remove the book'));
    }
  };

  return (
    <div className="nl-pop shv-dialog" role="dialog" aria-modal="true" aria-label={book.title}>
      <div className="shv-dlg-top">
        {book.coverImage ? (
          <img className="shv-dlg-cover" src={book.coverImage} alt={`Cover of ${book.title}`} />
        ) : (
          <div
            className="shv-dlg-cover shv-dlg-cloth"
            style={{ backgroundColor: cloth.color, color: cloth.ink }}
          >
            {book.title}
          </div>
        )}
        <div>
          <h2 className="shv-dlg-title">{book.title}</h2>
          <p className="shv-dlg-sub">
            {book.author}
            {noteFor({ ...book, status }) ? ` · ${noteFor({ ...book, status })}` : ''}
          </p>
        </div>
      </div>

      <div className="shv-dlg-block">
        <p className="shv-eyebrow">On the shelf</p>
        <Segmented
          options={STATUS_OPTIONS}
          value={status}
          onChange={changeStatus}
          ariaLabel="Reading status"
        />
      </div>

      <div className="shv-dlg-block">
        <p className="shv-eyebrow">Progress</p>
        <div className="shv-prog">
          <label htmlFor="shv-page">Page</label>
          <input
            id="shv-page"
            className="nl-in shv-num"
            type="number"
            min="0"
            inputMode="numeric"
            value={page}
            onChange={(e) => setPage(e.target.value)}
          />
          <label htmlFor="shv-total">of</label>
          <input
            id="shv-total"
            className="nl-in shv-num"
            type="number"
            min="0"
            inputMode="numeric"
            value={total}
            placeholder="—"
            onChange={(e) => setTotal(e.target.value)}
          />
          {dirty && (
            <button
              type="button"
              className="nl-ghost shv-small"
              onClick={saveProgress}
              disabled={busy}
            >
              Save
            </button>
          )}
        </div>
        <div className="shv-bar" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="shv-dlg-block">
        <p className="shv-eyebrow">Your quotes from this book</p>
        {kept.length > 0 ? (
          kept.map((q) => (
            <p key={q._id} className="shv-dlg-quote" style={{ borderLeftColor: cloth.color }}>
              “{q.text}” {q.page ? <span>{pageLabel(q.page)}</span> : null}
            </p>
          ))
        ) : (
          <p className="shv-dlg-none">No quotes kept yet. Log one during your next sitting.</p>
        )}
      </div>

      {confirming ? (
        <div className="shv-dlg-confirm" role="alertdialog" aria-label="Confirm removal">
          <span>
            Take <i>{book.title}</i> off your shelves? Its quotes stay with you.
          </span>
          <span className="shv-dlg-actions">
            <button
              type="button"
              className="nl-ghost shv-pill"
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              Keep it
            </button>
            <button type="button" className="shv-pill shv-danger" onClick={remove} disabled={busy}>
              Remove
            </button>
          </span>
        </div>
      ) : (
        <div className="shv-dlg-foot">
          <button type="button" className="shv-link" onClick={() => setConfirming(true)}>
            Remove from shelves
          </button>
          <span className="shv-dlg-actions">
            <button type="button" className="nl-ghost shv-pill" onClick={closeModal}>
              Close
            </button>
            <button type="button" className="nl-btn shv-pill shv-solid" onClick={readNow}>
              Read now
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
