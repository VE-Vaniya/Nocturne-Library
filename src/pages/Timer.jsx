import { useEffect, useEffectEvent, useState } from 'react'
import { useApp } from '../context/AppContext'
import * as api from '../services/api'
import Segmented from '../components/ui/Segmented'
import { PocketWatch, SimpleRing } from './timer/Faces'
import LogQuoteModal from './timer/LogQuoteModal'
import Celebration from './timer/Celebration'
import './timer/timer.css'

const BOOK_KEY = 'nocturne_timer_book' // written by Shelves' "Read now"
const MODE_KEY = 'nocturne_timer_mode'
const FACE_KEY = 'nocturne_timer_face'
const MODES = [
  { value: 'timer', label: 'Timer' },
  { value: 'stopwatch', label: 'Stopwatch' },
]
const FACES = [
  { value: 'pocket', label: 'Pocket watch' },
  { value: 'ring', label: 'Simple ring' },
]
const MIN_MINS = 1
const MAX_MINS = 300

const store = {
  get(area, key) {
    try {
      return window[area].getItem(key)
    } catch {
      return null
    }
  },
  set(area, key, value) {
    try {
      window[area].setItem(key, value)
    } catch {
      /* private mode / storage disabled: the setting just won't persist */
    }
  },
}
const pick = (value, options, fallback) => (options.some((o) => o.value === value) ? value : fallback)
const clampMins = (n) => Math.max(MIN_MINS, Math.min(MAX_MINS, n))
const pad = (n) => String(n).padStart(2, '0')

export default function Timer({ active }) {
  const { books, currentBook, stats, refreshStats, openModal, toast } = useApp()

  const [mode, setMode] = useState(() => pick(store.get('localStorage', MODE_KEY), MODES, 'timer'))
  const [face, setFace] = useState(() => pick(store.get('localStorage', FACE_KEY), FACES, 'pocket'))
  const [mins, setMins] = useState(30)
  const [minsDraft, setMinsDraft] = useState('30')

  // Time is kept as accumulated ms + the start of the running stretch, measured with
  // Date.now(), so throttled background tabs stay exact. `now` only drives re-renders.
  const [running, setRunning] = useState(false)
  const [accMs, setAccMs] = useState(0)
  const [startedAt, setStartedAt] = useState(0)
  const [now, setNow] = useState(0)
  const [sessionQuotes, setSessionQuotes] = useState(0)
  const [finishing, setFinishing] = useState(false)

  // Book choice: the "Read now" hand-off in sessionStorage wins whenever it changes.
  const [pickedId, setPickedId] = useState(null)
  const [seenHandoff, setSeenHandoff] = useState(null)
  const handoff = active ? store.get('sessionStorage', BOOK_KEY) : null
  if (handoff && handoff !== seenHandoff) {
    setSeenHandoff(handoff)
    setPickedId(handoff)
  }

  const all = books || []
  const reading = all.filter((b) => b.status === 'currently reading')
  const fallbackId = currentBook?._id || reading[0]?._id || ''
  const bookId = pickedId !== null && (pickedId === '' || all.some((b) => b._id === pickedId)) ? pickedId : fallbackId
  const book = all.find((b) => b._id === bookId) || (currentBook && currentBook._id === bookId ? currentBook : null)
  const options = book && !reading.some((b) => b._id === book._id) ? [book, ...reading] : reading

  const elapsedMs = accMs + (running ? Math.max(0, now - startedAt) : 0)
  const secs = Math.floor(elapsedMs / 1000)
  const total = mins * 60
  const shown = mode === 'timer' ? Math.max(0, total - secs) : secs
  const hh = Math.floor(shown / 3600)
  const mm = Math.floor((shown % 3600) / 60)
  const ss = shown % 60
  const clock = (hh ? `${hh}:` : '') + `${pad(mm)}:${pad(ss)}`
  const fraction = mode === 'timer' ? Math.min(secs / total, 1) : (secs % 3600) / 3600

  const finish = async () => {
    if (finishing) return
    const t = Date.now()
    const ms = accMs + (running ? t - startedAt : 0)
    let elapsedSeconds = Math.round(ms / 1000)
    if (mode === 'timer') elapsedSeconds = Math.min(elapsedSeconds, total)
    if (elapsedSeconds < 1) {
      toast('Start the timer first')
      return
    }
    const kept = sessionQuotes
    setRunning(false)
    setAccMs(0)
    setStartedAt(0)
    setNow(t)
    setSessionQuotes(0)
    setFinishing(true)

    let streak = stats?.streak ?? null
    try {
      const r = await api.updateReadingStats({ elapsedSeconds, bookId: book?._id })
      if (r?.data?.streak != null) streak = r.data.streak
      refreshStats()
    } catch (e) {
      toast(e?.response?.data?.message || 'Your sitting could not be recorded')
    } finally {
      setFinishing(false)
    }

    const m = Math.max(1, Math.round(elapsedSeconds / 60))
    const what = book ? `with ${book.title}` : 'of reading'
    const extra = kept ? `, ${kept} ${kept === 1 ? 'quote' : 'quotes'} kept.` : '.'
    openModal(<Celebration summary={`${m} ${m === 1 ? 'minute' : 'minutes'} ${what}${extra}`} streak={streak} book={book} />)
  }

  // One interval while running; the countdown finishes itself at zero.
  const onTick = useEffectEvent(() => {
    const t = Date.now()
    setNow(t)
    if (mode === 'timer' && accMs + (t - startedAt) >= total * 1000) finish()
  })
  useEffect(() => {
    if (!running) return undefined
    const id = setInterval(onTick, 250)
    return () => clearInterval(id)
  }, [running])

  const toggleRun = () => {
    const t = Date.now()
    if (running) {
      setAccMs((a) => a + (t - startedAt))
      setRunning(false)
      setNow(t)
      return
    }
    if (mode === 'timer' && accMs >= total * 1000) {
      finish()
      return
    }
    setStartedAt(t)
    setNow(t)
    setRunning(true)
  }

  const changeMode = (v) => {
    setMode(v)
    store.set('localStorage', MODE_KEY, v)
  }
  const changeFace = (v) => {
    setFace(v)
    store.set('localStorage', FACE_KEY, v)
  }
  const commitMins = (n) => {
    const v = clampMins(n)
    setMins(v)
    setMinsDraft(String(v))
  }
  const changeBook = (e) => {
    const id = e.target.value
    setPickedId(id)
    setSeenHandoff(id || seenHandoff)
    if (id) store.set('sessionStorage', BOOK_KEY, id)
  }

  const openLog = () => openModal(<LogQuoteModal book={book} onSaved={() => setSessionQuotes((n) => n + 1)} />)

  return (
    <div className="tmr">
      <div className="tmr-toggles">
        <Segmented options={MODES} value={mode} onChange={changeMode} ariaLabel="Mode" />
        <Segmented options={FACES} value={face} onChange={changeFace} ariaLabel="Clock face" />
      </div>

      <p className="tmr-reading">
        <label htmlFor="tmr-book">Reading</label>{' '}
        <span className="tmr-picker">
          <select id="tmr-book" value={book ? book._id : ''} onChange={changeBook}>
            {options.map((b) => (
              <option key={b._id} value={b._id}>
                {b.title}
              </option>
            ))}
            <option value="">nothing in particular</option>
          </select>
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </p>

      {face === 'pocket' ? <PocketWatch secs={secs} /> : <SimpleRing fraction={fraction} />}

      <div role="timer" aria-live="off" className="tmr-readout">
        <span className="tmr-clock">{clock}</span>
        <p className="tmr-note">{mode === 'timer' ? `left of a ${mins} minute sitting` : 'elapsed'}</p>
      </div>

      {mode === 'timer' && (
        <div className="tmr-mins">
          <button type="button" className="tmr-round" onClick={() => commitMins(mins - 5)} aria-label="Five minutes less" disabled={mins <= MIN_MINS}>
            −
          </button>
          <label htmlFor="tmr-mins-in">Sit for</label>
          <input
            id="tmr-mins-in"
            className="nl-in tmr-mins-in"
            type="number"
            min={MIN_MINS}
            max={MAX_MINS}
            inputMode="numeric"
            value={minsDraft}
            onChange={(e) => {
              setMinsDraft(e.target.value)
              const v = parseInt(e.target.value, 10)
              if (!Number.isNaN(v)) setMins(clampMins(v))
            }}
            onBlur={() => setMinsDraft(String(mins))}
          />
          <span>minutes</span>
          <button type="button" className="tmr-round" onClick={() => commitMins(mins + 5)} aria-label="Five minutes more" disabled={mins >= MAX_MINS}>
            +
          </button>
        </div>
      )}

      <div className="tmr-actions">
        <button type="button" className="nl-btn tmr-run" onClick={toggleRun} disabled={finishing}>
          {running ? 'Pause' : elapsedMs > 0 ? 'Resume' : 'Start'}
        </button>
        <button type="button" className="nl-ghost tmr-ghost" onClick={openLog}>
          ✎ Log a quote
        </button>
        <button type="button" className="nl-ghost tmr-ghost" onClick={finish} disabled={finishing}>
          {finishing ? 'Recording…' : 'Finish'}
        </button>
      </div>
    </div>
  )
}
