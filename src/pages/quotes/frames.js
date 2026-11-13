import { clothFor } from '../../components/ui/bookStyle'

// Ported 1:1 from the prototype's frame()/sizeFor()/TILTS, as style objects.
export const TILTS = ['-1.4deg', '0.9deg', '0deg', '1.5deg', '-0.6deg', '0.5deg', '-1deg', '1.2deg', '-0.3deg']

export function frameStyle(quote, i) {
  const c = (quote.bookTitle && clothFor(quote.bookTitle).color) || '#3a2f45'
  const v = i % 6
  if (v === 0)
    return {
      background: `linear-gradient(160deg,${c},#0e0e0e)`,
      color: '#f1dfb0',
      border: '1px solid #c8a050',
      outline: '1px solid rgba(200,160,80,.45)',
      outlineOffset: '-9px',
      borderRadius: '3px',
      padding: '34px 28px',
      textAlign: 'left',
    }
  if (v === 1)
    return {
      background: '#ebe1c8',
      color: '#2a221a',
      borderLeft: `9px solid ${c}`,
      borderRadius: '2px',
      padding: '26px 24px',
      textAlign: 'left',
    }
  if (v === 2)
    return {
      background: `linear-gradient(180deg,color-mix(in srgb,${c} 85%,#fff 12%),${c})`,
      color: '#f1dfb0',
      borderRadius: '220px 220px 8px 8px',
      padding: '74px 30px 32px',
      textAlign: 'center',
    }
  if (v === 3)
    return {
      background: `radial-gradient(circle at 0 50%,#0d1210 13px,transparent 14px),radial-gradient(circle at 100% 50%,#0d1210 13px,transparent 14px),color-mix(in srgb,${c} 30%,#ecdfc2)`,
      color: '#1d1712',
      borderRadius: '8px',
      padding: '30px 38px',
      textAlign: 'center',
      borderTop: '1px dashed rgba(0,0,0,.25)',
      borderBottom: '1px dashed rgba(0,0,0,.25)',
    }
  if (v === 4)
    return {
      background: `radial-gradient(circle at 35% 30%,color-mix(in srgb,${c} 75%,#fff 18%),${c} 60%,#0b0b0b)`,
      color: '#f1dfb0',
      borderRadius: '50%',
      aspectRatio: '1',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '44px',
      textAlign: 'center',
    }
  return {
    background: c,
    color: '#f1dfb0',
    border: '14px solid #efe5cc',
    borderBottomWidth: '46px',
    borderRadius: '2px',
    padding: '24px 22px',
    textAlign: 'left',
  }
}

export function sizeFor(quote, i) {
  const n = String(quote.text || '').length
  if (i % 6 === 4) return n > 70 ? '16px' : '19px'
  return n < 50 ? '27px' : n < 90 ? '22px' : '19px'
}

export function pageLabel(page) {
  if (page === undefined || page === null || page === '') return ''
  return /^\d+$/.test(String(page).trim()) ? `p. ${String(page).trim()}` : String(page)
}

export const metaLine = (q, withPage) =>
  [q.bookTitle, q.author, withPage ? pageLabel(q.page) : ''].filter(Boolean).join(' · ')
