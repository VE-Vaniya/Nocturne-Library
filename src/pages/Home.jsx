import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import ContinueReading from './home/ContinueReading.jsx';
import { PUBLIC_QUOTES, greetingFor } from './home/greeting.js';

const serif = "'IM Fell English',Georgia,serif";

export default function Home() {
  const { user, stats, quotes, currentBook, go } = useApp();
  const [seed] = useState(() => Math.random());
  const [hour] = useState(() => new Date().getHours());

  const firstName = (user?.fullName || user?.username || 'reader').trim().split(/\s+/)[0];
  const streak = Number(stats?.streak) || 0;

  const quote = useMemo(() => {
    const mine = (quotes || []).filter((q) => q?.text);
    if (mine.length) {
      const q = mine[Math.floor(seed * mine.length)];
      return {
        text: q.text,
        by: [q.author || q.bookTitle, 'from your quotes'].filter(Boolean).join(' · '),
      };
    }
    const q = PUBLIC_QUOTES[Math.floor(seed * PUBLIC_QUOTES.length)];
    return { text: q.text, by: q.author };
  }, [quotes, seed]);

  return (
    <div
      style={{
        maxWidth: 980,
        margin: '0 auto',
        padding: '30px 32px 20px',
        display: 'grid',
        gap: 36,
      }}
    >
      <div
        className="nl-two"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) auto',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 62, lineHeight: 1 }}
          >
            {greetingFor(hour)}, <i style={{ color: '#e9c779' }}>{firstName}</i>.
          </h1>
          <blockquote
            style={{
              margin: '18px 0 0',
              padding: '0 0 0 18px',
              borderLeft: '1px solid rgba(200,160,80,.5)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: serif,
                fontStyle: 'italic',
                fontSize: 24,
                lineHeight: 1.35,
                color: '#d9cdb0',
                maxWidth: '34ch',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              “{quote.text}”
            </p>
            <p style={{ margin: '6px 0 0', color: '#8f8775', fontSize: 15 }}>{quote.by}</p>
          </blockquote>
        </div>
        <div
          role="img"
          aria-label={`${streak} ${streak === 1 ? 'night' : 'nights'} in a row`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 18px',
            border: '1px solid rgba(200,160,80,.28)',
            borderRadius: 999,
            background: 'rgba(21,29,25,.7)',
          }}
        >
          <span
            className="nl-flame"
            aria-hidden="true"
            style={{
              width: 16,
              height: 24,
              borderRadius: '50% 50% 50% 50%/60% 60% 40% 40%',
              background:
                'radial-gradient(circle at 50% 75%,#fff6d8 0 18%,#ffc65a 42%,#c8501e 75%,rgba(200,80,30,0) 76%)',
              boxShadow: '0 0 22px 4px rgba(255,170,70,.3)',
              opacity: streak ? 1 : 0.45,
            }}
          />
          <span aria-hidden="true">
            <b style={{ fontFamily: serif, fontWeight: 400, fontSize: 30, lineHeight: 1 }}>
              {streak}
            </b>{' '}
            <span style={{ color: '#a89f88' }}>night streak</span>
          </span>
        </div>
      </div>

      <ContinueReading book={currentBook} onSit={() => go('timer')} onFind={() => go('find')} />
    </div>
  );
}
