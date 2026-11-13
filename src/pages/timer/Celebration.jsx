import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import * as api from '../../services/api'

const EMBERS = [8, 15, 22, 31, 38, 46, 53, 61, 68, 74, 81, 88, 93, 27].map((x, i) => ({
  x: `${x}%`,
  s: `${3 + (i % 3) * 2}px`,
  d: `${(i * 0.41).toFixed(2)}s`,
}))

/** "Well read." — embers, rays, the sitting's summary, the new streak and where you stopped. */
export default function Celebration({ summary, streak, book }) {
  const { closeModal, go, refreshBooks, refreshStats, toast } = useApp()
  const [page, setPage] = useState(book?.lastPageRead ? String(book.lastPageRead) : '')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const savePage = async (e) => {
    e.preventDefault()
    const n = parseInt(page, 10)
    if (!book || !(n >= 0)) return
    if (book.totalPages && n > book.totalPages) {
      toast(`This edition ends at page ${book.totalPages}`)
      return
    }
    setBusy(true)
    try {
      const prev = Number(book.lastPageRead) || 0
      await api.updateReadingStats({ elapsedSeconds: 0, pagesRead: Math.max(0, n - prev), bookId: book._id, lastPageRead: n })
      setSaved(true)
      refreshBooks()
      refreshStats()
    } catch (err) {
      toast(err?.response?.data?.message || 'Could not save your page')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tmr-done" role="dialog" aria-modal="true" aria-label="Sitting finished">
      <div className="nl-rays tmr-done-rays" aria-hidden="true" />
      {EMBERS.map((e, i) => (
        <span key={i} className="nl-ember tmr-ember" aria-hidden="true" style={{ left: e.x, width: e.s, height: e.s, animationDelay: e.d }} />
      ))}
      <span className="nl-flame nl-pop tmr-done-flame" aria-hidden="true" />
      <h2 className="nl-pop tmr-done-h">Well read.</h2>
      <p className="nl-pop tmr-done-sum" style={{ animationDelay: '.1s' }}>
        {summary}
      </p>
      {streak != null && (
        <p className="nl-pop tmr-done-streak" style={{ animationDelay: '.2s' }}>
          Your streak is now {streak} {streak === 1 ? 'night' : 'nights'}.
        </p>
      )}
      {book && (
        <form className="nl-pop tmr-done-page" style={{ animationDelay: '.25s' }} onSubmit={savePage}>
          {saved ? (
            <span className="tmr-done-saved">Marked at page {page} ✓</span>
          ) : (
            <>
              <label htmlFor="tmr-stop">Stopped at page</label>
              <input
                id="tmr-stop"
                className="nl-in tmr-done-in"
                type="number"
                min="0"
                max={book.totalPages || undefined}
                inputMode="numeric"
                value={page}
                onChange={(e) => setPage(e.target.value)}
              />
              {book.totalPages ? <span className="tmr-done-of">of {book.totalPages}</span> : null}
              <button type="submit" className="nl-ghost tmr-done-mini" disabled={busy || page === ''}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </form>
      )}
      <div className="nl-pop tmr-done-actions" style={{ animationDelay: '.3s' }}>
        <button
          type="button"
          className="nl-btn tmr-pill tmr-solid"
          onClick={() => {
            closeModal()
            go('home')
          }}
        >
          Back home
        </button>
        <button type="button" className="nl-ghost tmr-pill tmr-dim" onClick={closeModal}>
          Another sitting
        </button>
      </div>
    </div>
  )
}
