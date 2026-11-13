import { useApp } from '../context/AppContext'
import ScrollArea from '../components/ui/ScrollArea'
import QuoteOverlay from './quotes/QuoteOverlay'
import { TILTS, frameStyle, metaLine, sizeFor } from './quotes/frames'
import './quotes/quotes.css'

export default function Quotes({ active }) {
  const { quotes, openModal, go } = useApp()
  const list = quotes || []

  return (
    <div className="qts" aria-hidden={active === false ? true : undefined}>
      <div className="qts-head">
        <h1 className="qts-h1">Your quotes</h1>
        {list.length > 0 && <span className="qts-count">{list.length} kept · tap one to hold it up to the light</span>}
      </div>

      {list.length === 0 ? (
        <div className="qts-empty">
          <p className="qts-empty-title">Nothing pinned yet.</p>
          <p className="qts-empty-sub">Log a line during a sitting, or save one a friend sends you, and it will hang here.</p>
          <button type="button" className="nl-btn qts-pill qts-solid" onClick={() => go('timer')}>
            Start a sitting
          </button>
        </div>
      ) : (
        <ScrollArea className="qts-scroll">
          <div className="qts-board">
            {list.map((q, i) => (
              <button
                key={q._id}
                type="button"
                className="nl-qcard qts-card"
                onClick={() => openModal(<QuoteOverlay quoteId={q._id} index={i} />)}
                style={{ rotate: TILTS[i % TILTS.length], ...frameStyle(q, i) }}
              >
                <span className="qts-card-text" style={{ fontSize: sizeFor(q, i) }}>
                  “{q.text}”
                </span>
                <span className="qts-card-meta">{metaLine(q, false)}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
