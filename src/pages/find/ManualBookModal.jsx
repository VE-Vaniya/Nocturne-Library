import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import * as api from '../../services/api'
import Segmented from '../../components/ui/Segmented'
import { clothFor } from '../../components/ui/bookStyle'
import { resizeImageFile } from './imageResize'

const STATUS = [
  { value: 'currently reading', label: 'Reading' },
  { value: 'completed', label: 'Finished' },
  { value: 'wishlist', label: 'Want to read' },
]

/** "Enter a book by hand" form: title, author, total pages, status, optional cover. */
export default function ManualBookModal({ initialTitle = '' }) {
  const { refreshBooks, closeModal, toast } = useApp()
  const [title, setTitle] = useState(initialTitle)
  const [author, setAuthor] = useState('')
  const [pages, setPages] = useState('')
  const [status, setStatus] = useState('wishlist')
  const [cover, setCover] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const cloth = clothFor(title.trim() || 'Untitled')

  const pickCover = async (e) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      setCover(await resizeImageFile(file, 600))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    const t = title.trim()
    const a = author.trim()
    if (!t || !a) {
      setError('A title and an author, at least.')
      return
    }
    const total = parseInt(pages, 10)
    setBusy(true)
    try {
      await api.addBook({
        title: t,
        author: a,
        status,
        totalPages: total > 0 ? total : undefined,
        coverImage: cover || undefined,
      })
      closeModal()
      await refreshBooks()
      toast(`${t} added to your shelves`)
    } catch (err) {
      setBusy(false)
      setError(err?.response?.data?.message || 'Could not add the book')
    }
  }

  return (
    <form className="nl-pop fnd-dialog" role="dialog" aria-modal="true" aria-label="Enter a book by hand" onSubmit={submit}>
      <div className="fnd-dlg-head">
        <b>A book by hand</b>
        <button type="button" className="fnd-x" onClick={closeModal} aria-label="Close">
          ×
        </button>
      </div>

      <div className="fnd-dlg-cover-row">
        {cover ? (
          <img className="fnd-dlg-cover" src={cover} alt="Chosen cover" />
        ) : (
          <span className="fnd-dlg-cover fnd-dlg-cloth" style={{ backgroundColor: cloth.color, color: cloth.ink }}>
            {title.trim() || 'Untitled'}
          </span>
        )}
        <div className="fnd-dlg-cover-actions">
          <label htmlFor="fnd-cover" className="nl-ghost fnd-upload">
            {cover ? 'Choose another cover' : 'Upload a cover'}
          </label>
          <input id="fnd-cover" type="file" accept="image/*" onChange={pickCover} className="fnd-file" />
          {cover && (
            <button type="button" className="fnd-textbtn" onClick={() => setCover('')}>
              Use the cloth instead
            </button>
          )}
          <span className="fnd-hint">Optional. Without one it gets a cloth binding.</span>
        </div>
      </div>

      <div className="fnd-field">
        <label htmlFor="fnd-title">Title</label>
        <input id="fnd-title" className="nl-in" value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" required />
      </div>
      <div className="fnd-field">
        <label htmlFor="fnd-author">Author</label>
        <input id="fnd-author" className="nl-in" value={author} onChange={(e) => setAuthor(e.target.value)} autoComplete="off" required />
      </div>
      <div className="fnd-field">
        <label htmlFor="fnd-pages">Total pages</label>
        <input
          id="fnd-pages"
          className="nl-in"
          type="number"
          min="1"
          inputMode="numeric"
          value={pages}
          onChange={(e) => setPages(e.target.value)}
        />
      </div>
      <div className="fnd-field">
        <span className="fnd-label">Shelf</span>
        <Segmented options={STATUS} value={status} onChange={setStatus} ariaLabel="Shelf" />
      </div>

      {error && (
        <p className="fnd-error" role="alert">
          {error}
        </p>
      )}

      <div className="fnd-dlg-foot">
        <button type="button" className="nl-ghost fnd-pill" onClick={closeModal}>
          Cancel
        </button>
        <button type="submit" className="nl-btn fnd-pill fnd-solid" disabled={busy}>
          {busy ? 'Shelving…' : 'Add to shelf'}
        </button>
      </div>
    </form>
  )
}
