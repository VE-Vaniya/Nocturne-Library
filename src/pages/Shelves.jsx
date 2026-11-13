import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import Segmented from '../components/ui/Segmented';
import Tabs from '../components/ui/Tabs';
import ScrollArea from '../components/ui/ScrollArea';
import { clothFor } from '../components/ui/bookStyle';
import BookSpine from './shelves/BookSpine';
import BookModal from './shelves/BookModal';
import { FILTERS, leanFor, noteFor, pad2 } from './shelves/shelfData';
import './shelves/shelves.css';

const VIEWS = [
  { value: 'shelf', label: 'Shelf' },
  { value: 'list', label: 'List' },
];
const ROWS = 4;

export default function Shelves({ active }) {
  const { books, go, openModal } = useApp();
  const [view, setView] = useState('shelf');
  const [filter, setFilter] = useState('all');

  const all = useMemo(() => books || [], [books]);
  const match = (FILTERS.find((f) => f.value === filter) || FILTERS[0]).match;
  const shown = useMemo(() => all.filter(match), [all, match]);
  const tabs = FILTERS.map((f) => ({
    value: f.value,
    label: f.label,
    count: all.filter(f.match).length,
  }));

  // Books spread evenly over four shelves, like the prototype.
  const perRow = Math.ceil(shown.length / ROWS) || 1;
  const rows = Array.from({ length: ROWS }, (_, r) => shown.slice(r * perRow, (r + 1) * perRow));
  const leanIdx = (b) => all.indexOf(b);

  const pick = (b) => openModal(<BookModal bookId={b._id} />);

  return (
    <div className="shv" aria-hidden={active === false ? true : undefined}>
      <div className="shv-head">
        <h1 className="shv-h1">Your shelves</h1>
        <div className="shv-controls">
          <Segmented options={VIEWS} value={view} onChange={setView} ariaLabel="View" />
          <button type="button" className="nl-ghost shv-add" onClick={() => go('find')}>
            + Add a book
          </button>
        </div>
      </div>

      <Tabs tabs={tabs} value={filter} onChange={setFilter} ariaLabel="Shelf" />

      {all.length === 0 ? (
        <div className="shv-empty">
          <p className="shv-empty-title">Your shelves are bare.</p>
          <p className="shv-empty-sub">
            Find a first book and it will stand here, cloth-bound and waiting.
          </p>
          <button type="button" className="nl-btn shv-pill shv-solid" onClick={() => go('find')}>
            Find a book
          </button>
        </div>
      ) : view === 'shelf' ? (
        <div className="shv-case">
          {rows.map((row, r) => (
            <div className="shv-row" key={r}>
              <div className="shv-strip">
                {row.map((b) => (
                  <BookSpine
                    key={b._id}
                    book={b}
                    lean={leanFor(leanIdx(b))}
                    onPick={() => pick(b)}
                  />
                ))}
              </div>
              <div className="shv-plank" aria-hidden="true" />
            </div>
          ))}
          {shown.length === 0 && <p className="shv-case-note">Nothing on this shelf yet.</p>}
        </div>
      ) : (
        <ScrollArea className="shv-listwrap">
          {shown.length === 0 ? (
            <p className="shv-list-none">Nothing on this shelf yet.</p>
          ) : (
            <ol className="shv-list">
              {shown.map((b, i) => (
                <li key={b._id}>
                  <button type="button" className="nl-row shv-li" onClick={() => pick(b)}>
                    <span className="shv-li-num">{pad2(i + 1)}</span>
                    <span
                      aria-hidden="true"
                      className="shv-li-cloth"
                      style={{ background: clothFor(b.title).color }}
                    />
                    <span className="shv-li-main">
                      <b>{b.title}</b>
                      <br />
                      <span>{b.author}</span>
                    </span>
                    <span className="shv-li-note">{noteFor(b)}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
