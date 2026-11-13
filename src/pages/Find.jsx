import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import * as api from '../services/api'
import Tabs from '../components/ui/Tabs'
import Avatar from '../components/ui/Avatar'
import ScrollArea from '../components/ui/ScrollArea'
import { clothFor } from '../components/ui/bookStyle'
import ManualBookModal from './find/ManualBookModal'
import './find/find.css'

const TABS = [
  { value: 'books', label: 'Books' },
  { value: 'people', label: 'People' },
]
const DEBOUNCE_MS = 350
const norm = (s) => String(s || '').trim().toLowerCase()
const errMsg = (e, fallback) => e?.response?.data?.message || fallback
const idOf = (x) => (x && typeof x === 'object' ? x._id : x)

function fetchFor(tab, q) {
  if (tab === 'books') return q ? api.searchBooks(q) : api.getBookSuggestions()
  return q ? api.searchPeople(q) : api.getSuggestions()
}

function readingLabel(cr) {
  if (!cr) return ''
  const title = typeof cr === 'string' ? cr : cr.title
  return title ? `reading ${title}` : ''
}

export default function Find({ active }) {
  const { books, friends, notifications, refreshBooks, refreshFriends, refreshNotifications, toast, openModal } = useApp()
  const [tab, setTab] = useState('books')
  const [q, setQ] = useState('')
  const [dq, setDq] = useState('')
  const [data, setData] = useState({}) // `${tab}:${query}` -> array | { error }
  const [adding, setAdding] = useState({}) // title -> true while saving
  const [rel, setRel] = useState({}) // person id -> 'none' | 'sent' | 'friend' (local overrides)
  const [pending, setPending] = useState({}) // person id -> true while a request is in flight

  // Debounce the single search field.
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [q])

  // Fetch suggestions / results for the visible tab; results are cached per key so
  // late answers for an older query never overwrite the current one.
  useEffect(() => {
    if (!active) return
    const key = `${tab}:${dq}`
    fetchFor(tab, dq)
      .then((r) => setData((d) => ({ ...d, [key]: Array.isArray(r.data) ? r.data : [] })))
      .catch((e) => setData((d) => ({ ...d, [key]: { error: errMsg(e, 'The catalogue did not answer. Try again in a moment.') } })))
  }, [active, tab, dq])

  const shelfTitles = useMemo(() => new Set((books || []).map((b) => norm(b.title))), [books])
  const friendIds = useMemo(() => new Set((friends || []).map((f) => f._id)), [friends])

  const typed = q.trim()
  const settled = typed === dq
  const entry = data[`${tab}:${dq}`]
  const list = Array.isArray(entry) ? entry : []
  const loading = entry === undefined || !settled
  const heading = typed ? 'Results' : tab === 'books' ? 'Suggested for you' : 'People you may know'

  const addBook = async (r) => {
    if (adding[r.title]) return
    setAdding((a) => ({ ...a, [r.title]: true }))
    try {
      await api.addBook({
        title: r.title,
        author: r.author || 'Unknown author',
        genre: r.genre,
        coverImage: r.image || undefined,
        status: 'wishlist',
      })
      await refreshBooks()
      toast(`${r.title} added to Want to read`)
    } catch (e) {
      toast(errMsg(e, 'Could not add the book'))
    } finally {
      setAdding((a) => {
        const next = { ...a }
        delete next[r.title]
        return next
      })
    }
  }

  const statusOf = (p) => {
    if (friendIds.has(p._id)) return 'friend'
    return rel[p._id] || p.requestStatus || 'none'
  }

  const togglePerson = async (p) => {
    const st = statusOf(p)
    if (st === 'friend' || pending[p._id]) return
    setPending((x) => ({ ...x, [p._id]: true }))
    const name = (p.fullName || p.username || 'them').split(' ')[0]
    try {
      if (st === 'sent') {
        await api.cancelConnect(p._id)
        setRel((r) => ({ ...r, [p._id]: 'none' }))
        toast(`Request to ${name} withdrawn`)
      } else if (st === 'incoming') {
        const note = (notifications || []).find(
          (n) => idOf(n.senderId || n.sender || n.from) === p._id && (!n.status || n.status === 'pending'),
        )
        if (!note) {
          toast('Answer their request from your notifications')
          return
        }
        await api.respond(note._id, 'accepted')
        setRel((r) => ({ ...r, [p._id]: 'friend' }))
        refreshFriends()
        refreshNotifications()
        toast(`You and ${name} are now friends`)
      } else {
        await api.connect(p._id)
        setRel((r) => ({ ...r, [p._id]: 'sent' }))
        toast(`Request sent to ${name}`)
      }
    } catch (e) {
      toast(errMsg(e, 'That did not go through'))
    } finally {
      setPending((x) => {
        const next = { ...x }
        delete next[p._id]
        return next
      })
    }
  }

  const openManual = () => openModal(<ManualBookModal initialTitle={tab === 'books' ? typed : ''} />)

  return (
    <div className="fnd">
      <h1 className="fnd-h1">Find</h1>
      <Tabs tabs={TABS} value={tab} onChange={setTab} ariaLabel="Search for" />

      <div className="fnd-search">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c8a050" strokeWidth="1.5">
          <path d="M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M16 16l5 5" />
        </svg>
        <label htmlFor="fnd-q" className="fnd-sr">
          {tab === 'books' ? 'Search books by title or author' : 'Search people by name'}
        </label>
        <input
          id="fnd-q"
          className="nl-in fnd-input"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tab === 'books' ? 'Search books by title or author' : 'Search people by name'}
          autoComplete="off"
          spellCheck="false"
        />
      </div>

      <div className="fnd-subhead">
        <p className="fnd-eyebrow">{heading}</p>
        {tab === 'books' && (
          <button type="button" className="fnd-textbtn" onClick={openManual}>
            Enter a book by hand
          </button>
        )}
      </div>

      <ScrollArea className="fnd-results">
        {entry && entry.error && settled ? (
          <p className="fnd-quiet" role="alert">
            {entry.error}
          </p>
        ) : loading && list.length === 0 ? (
          <p className="fnd-quiet" aria-live="polite">
            {typed ? 'Searching the stacks…' : 'Gathering suggestions…'}
          </p>
        ) : list.length === 0 ? (
          <p className="fnd-quiet">
            {tab === 'books'
              ? typed
                ? 'Nothing by that name. You can enter it by hand.'
                : 'No suggestions yet. Shelve a few books and they will come.'
              : typed
                ? 'No reader by that name.'
                : 'No one to suggest just yet.'}
          </p>
        ) : tab === 'books' ? (
          <div className={loading ? 'fnd-list is-stale' : 'fnd-list'}>
            {list.map((r, i) => {
              const has = shelfTitles.has(norm(r.title))
              const busy = !!adding[r.title]
              const year = r.year || (r.publishedDate ? String(r.publishedDate).slice(0, 4) : '')
              const meta = [r.author, year, r.reason || r.genre].filter(Boolean).join(' · ')
              return (
                <div className="nl-row fnd-row" key={r.id || `${r.title}-${i}`}>
                  {r.image ? (
                    <img className="fnd-thumb" src={r.image} alt="" loading="lazy" />
                  ) : (
                    <span aria-hidden="true" className="fnd-stripe" style={{ background: clothFor(r.title).color }} />
                  )}
                  <div className="fnd-row-main">
                    <b>{r.title}</b>
                    <br />
                    <span>{meta}</span>
                  </div>
                  <button
                    type="button"
                    className={has ? 'fnd-toggle is-on' : 'fnd-toggle'}
                    onClick={() => !has && addBook(r)}
                    aria-disabled={has || busy}
                    disabled={busy}
                  >
                    {has ? 'On your shelf ✓' : busy ? 'Shelving…' : 'Add to shelf'}
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className={loading ? 'fnd-people is-stale' : 'fnd-people'}>
            {list.map((p) => {
              const st = statusOf(p)
              const name = p.fullName || p.username
              const common = Number(p.booksInCommon) || 0
              const why =
                [common ? `${common} ${common === 1 ? 'book' : 'books'} in common` : '', readingLabel(p.currentlyReading)]
                  .filter(Boolean)
                  .join(' · ') || `@${p.username}`
              const label = st === 'friend' ? 'Friends' : st === 'sent' ? 'Requested' : st === 'incoming' ? 'Accept request' : 'Add friend'
              return (
                <div className="fnd-card" key={p._id}>
                  <Avatar name={name} photo={p.avatar} size={62} />
                  <b>{name}</b>
                  <span className="fnd-why">{why}</span>
                  <button
                    type="button"
                    className={st === 'none' || st === 'incoming' ? 'fnd-rel is-cta' : 'fnd-rel'}
                    onClick={() => togglePerson(p)}
                    aria-disabled={st === 'friend'}
                    disabled={!!pending[p._id]}
                    title={st === 'sent' ? 'Click to withdraw the request' : undefined}
                  >
                    {label}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
