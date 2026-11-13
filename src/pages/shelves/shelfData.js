// Shelf filters, status labels and per-book presentation helpers.

export const TIMER_BOOK_KEY = 'nocturne_timer_book'

export const FILTERS = [
  { value: 'all', label: 'All', match: () => true },
  { value: 'reading', label: 'Reading', match: (b) => b.status === 'currently reading' },
  { value: 'finished', label: 'Finished', match: (b) => b.status === 'completed' },
  { value: 'want', label: 'Want to read', match: (b) => b.status === 'wishlist' },
]

export const STATUS_OPTIONS = [
  { value: 'currently reading', label: 'Reading' },
  { value: 'completed', label: 'Finished' },
  { value: 'wishlist', label: 'Want to read' },
  { value: 'dropped', label: 'Set aside' },
]

/** Same lean rule as the prototype: a few books tip against their neighbours. */
export function leanFor(idx) {
  if (idx % 7 === 3) return '-4deg'
  if (idx % 11 === 5) return '3deg'
  return '0deg'
}

/** The quiet right-hand note in the list view and book card. */
export function noteFor(book) {
  const page = Number(book.lastPageRead) || 0
  const total = Number(book.totalPages) || 0
  switch (book.status) {
    case 'currently reading':
      if (total) return `page ${page} of ${total}`
      return page ? `page ${page}` : 'reading now'
    case 'completed':
      return 'finished'
    case 'wishlist':
      return 'want to read'
    case 'dropped':
      return 'set aside'
    default:
      return ''
  }
}

const norm = (s) => String(s || '').trim().toLowerCase()

/** Quotes saved from a book: matched by bookId, falling back to the title. */
export function quotesForBook(quotes, book) {
  if (!book) return []
  const t = norm(book.title)
  return (quotes || []).filter((q) => (q.bookId && q.bookId === book._id) || norm(q.bookTitle) === t)
}

export const pad2 = (n) => String(n).padStart(2, '0')

/** Quote page as shown under a quote: numbers become "p. 47", free text ("Book I") stays. */
export function pageLabel(page) {
  if (page === undefined || page === null || page === '') return ''
  return /^\d+$/.test(String(page).trim()) ? `p. ${String(page).trim()}` : String(page)
}
