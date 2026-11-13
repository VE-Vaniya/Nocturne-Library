import Button from '../../components/ui/Button.jsx';
import { clothFor, coverBackground } from '../../components/ui/bookStyle.js';

const MIN_PER_PAGE = 1.2;

/** Pages read / total, accepting legacy "351 / 551" progress strings. */
function pagesOf(book) {
  let read = Number(book?.lastPageRead) || 0;
  let total = Number(book?.totalPages) || 0;
  const m = typeof book?.progress === 'string' && book.progress.match(/(\d+)\s*\/\s*(\d+)/);
  if (m) {
    read = read || Number(m[1]);
    total = total || Number(m[2]);
  }
  return { read, total };
}

function progressNote(read, total) {
  if (!total) return read ? `Page ${read}` : 'Not begun yet';
  if (read >= total) return `Page ${total} of ${total} · the final page`;
  const mins = Math.round((total - read) * MIN_PER_PAGE);
  const left =
    mins < 60
      ? `about ${Math.max(1, mins)} minutes left`
      : `about ${Math.round(mins / 60)} ${Math.round(mins / 60) === 1 ? 'hour' : 'hours'} left`;
  return `${read ? `Page ${read} of ${total}` : `${total} pages`} · ${left}`;
}

const coverBox = {
  width: 132,
  height: 198,
  borderRadius: '3px 7px 7px 3px',
  boxShadow: '0 24px 32px -16px rgba(0,0,0,.9)',
};

/** Compact "Continue reading" card (prototype .nl-cr), or its empty state. */
export default function ContinueReading({ book, onSit, onFind }) {
  const card = {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0,1fr)',
    gap: 28,
    alignItems: 'start',
    padding: 24,
    border: '1px solid rgba(200,160,80,.2)',
    borderRadius: 10,
    background: 'linear-gradient(135deg,rgba(47,74,59,.25),rgba(13,18,16,0) 60%)',
  };

  if (!book) {
    return (
      <section aria-label="Continue reading" className="nl-cr" style={card}>
        <div style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
          <div
            className="nl-cr-cover"
            aria-hidden="true"
            style={{
              ...coverBox,
              boxShadow: 'none',
              border: '1px dashed rgba(200,160,80,.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6f6a5c',
              fontFamily: 'var(--nl-serif)',
              fontSize: 40,
            }}
          >
            ❦
          </div>
          <Button onClick={onFind} style={{ width: 132, minHeight: 42, padding: 0, fontSize: 15 }}>
            Find a book
          </Button>
        </div>
        <div style={{ minWidth: 0, paddingTop: 4 }}>
          <p
            style={{
              margin: 0,
              color: '#8f8775',
              fontSize: 14,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
            }}
          >
            Continue reading
          </p>
          <h2
            style={{
              margin: '6px 0 4px',
              fontFamily: 'var(--nl-serif)',
              fontWeight: 400,
              fontSize: 36,
              lineHeight: 1.05,
            }}
          >
            The nightstand is empty
          </h2>
          <p style={{ margin: 0, color: '#a89f88', maxWidth: '42ch' }}>
            Mark a book as <i>currently reading</i> and it will wait for you here, candle lit.
          </p>
        </div>
      </section>
    );
  }

  const { read, total } = pagesOf(book);
  const pct = total ? Math.min(100, Math.round((read / total) * 100)) : 0;
  const cloth = clothFor(book.title);

  return (
    <section aria-label="Continue reading" className="nl-cr" style={card}>
      <div style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={`Cover of ${book.title}`}
            style={{ ...coverBox, objectFit: 'cover' }}
          />
        ) : (
          <div
            className="nl-cr-cover"
            aria-hidden="true"
            style={{
              ...coverBox,
              padding: '16px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              background: coverBackground(cloth.color),
              color: cloth.ink,
              fontFamily: 'var(--nl-serif)',
              fontSize: 18,
              lineHeight: 1.1,
              outline: `1px solid color-mix(in srgb,${cloth.ink} 35%,transparent)`,
              outlineOffset: -8,
              overflow: 'hidden',
              overflowWrap: 'anywhere',
            }}
          >
            {book.title}
          </div>
        )}
        <Button onClick={onSit} style={{ width: 132, minHeight: 42, padding: 0, fontSize: 15 }}>
          Start a sitting
        </Button>
      </div>
      <div style={{ minWidth: 0, paddingTop: 4 }}>
        <p
          style={{
            margin: 0,
            color: '#8f8775',
            fontSize: 14,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
          }}
        >
          Continue reading
        </p>
        <h2
          style={{
            margin: '6px 0 4px',
            fontFamily: 'var(--nl-serif)',
            fontWeight: 400,
            fontSize: 36,
            lineHeight: 1.05,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {book.title}
        </h2>
        <p style={{ margin: 0, color: '#a89f88' }}>{book.author}</p>
        <div
          role="progressbar"
          aria-label="Reading progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          style={{
            height: 3,
            background: '#1e2924',
            margin: '18px 0 8px',
            maxWidth: 360,
            position: 'relative',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${pct}%`,
              background: 'linear-gradient(90deg,#c8a050,#e9c779)',
              transition: 'width .8s cubic-bezier(.22,1,.36,1)',
            }}
          />
        </div>
        <p style={{ margin: 0, color: '#a89f88', fontSize: 15 }}>{progressNote(read, total)}</p>
      </div>
    </section>
  );
}
