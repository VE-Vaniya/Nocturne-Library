import { useRef, useState } from 'react';
import { sealBg } from '../ui/seals.js';
import { STEP, TAB_ICONS } from './wheel.js';

/**
 * The top wheel menu: drag / scroll-wheel to spin, arrow buttons, click a tab to jump.
 * Props: tabs [{name,label}], pageIndex, onGo(index), bell (node), me (node)
 */
export default function WheelMenu({ tabs, pageIndex, onGo, bell, me }) {
  // spin is tied to the page it was set on; a page change resets it (prototype go(): spin 0, cls '')
  const [spinState, setSpinState] = useState({ page: pageIndex, spin: 0, cls: '' });
  const spin = spinState.page === pageIndex ? spinState.spin : 0;
  const cls = spinState.page === pageIndex ? spinState.cls : '';
  const drag = useRef(null);
  const moved = useRef(false);
  const [dragging, setDragging] = useState(false);

  const clamp = (v) => {
    const lo = -STEP * 1.2 - pageIndex * STEP;
    const hi = (tabs.length - 1 + 1.2) * STEP - pageIndex * STEP;
    return Math.max(lo, Math.min(hi, v));
  };
  const setSpin = (v, c) => setSpinState({ page: pageIndex, spin: clamp(v), cls: c });
  const nudge = (delta) =>
    setSpinState((s) => ({
      page: pageIndex,
      spin: clamp((s.page === pageIndex ? s.spin : 0) + delta),
      cls: 'fast',
    }));

  const go = (i) => {
    if (moved.current) {
      moved.current = false;
      return;
    }
    setSpinState({ page: i, spin: 0, cls: '' });
    onGo(i);
  };

  const onWheel = (e) => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    nudge(d * 0.012);
  };
  const onDown = (e) => {
    if (e.button != null && e.button !== 0) return;
    drag.current = { x: e.clientX, spin, id: e.pointerId, el: e.currentTarget, cap: false };
    moved.current = false;
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.cap && Math.abs(dx) > 6) {
      d.cap = true;
      moved.current = true;
      setDragging(true);
      try {
        d.el.setPointerCapture(d.id);
      } catch {
        // pointer already released
      }
    }
    if (d.cap) setSpin(d.spin - dx * 0.027, 'drag');
  };
  const onUp = () => {
    if (drag.current && drag.current.cap) {
      setSpinState((s) => ({ ...s, cls: 'fast' }));
      setTimeout(() => {
        moved.current = false;
      }, 0);
    }
    drag.current = null;
    setDragging(false);
  };

  return (
    <header
      className={`nl-header${dragging ? ' is-drag' : ''}`}
      onWheel={onWheel}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <nav aria-label="Main">
        <div
          className={`nl-wheel ${cls}`}
          style={{ transform: `rotate(${pageIndex * STEP + spin}deg)` }}
        >
          <div className="nl-wheel-rim" aria-hidden="true" />
          <div className="nl-wheel-rays1" aria-hidden="true" />
          <div className="nl-wheel-rays2" aria-hidden="true" />
          {tabs.map((t, i) => (
            <button
              key={t.name}
              type="button"
              className="nl-tab"
              onClick={() => go(i)}
              aria-current={i === pageIndex ? 'page' : undefined}
              style={{ transform: `rotate(${-i * STEP}deg) translateY(2122px)` }}
            >
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={TAB_ICONS[t.name]} />
              </svg>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
      <span className="nl-wheel-pin" aria-hidden="true" />
      <button
        type="button"
        className="nl-spin-btn nl-spin-l nl-hide-sm"
        onClick={() => nudge(-STEP * 2)}
        aria-label="Turn the menu left"
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M15 5 8 12l7 7" />
        </svg>
      </button>
      <button
        type="button"
        className="nl-spin-btn nl-spin-r nl-hide-sm"
        onClick={() => nudge(STEP * 2)}
        aria-label="Turn the menu right"
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="m9 5 7 7-7 7" />
        </svg>
      </button>
      {bell}
      {me}
    </header>
  );
}

/** Profile avatar button pinned top-right. */
export function MeButton({ user, onClick }) {
  const name = user?.fullName || user?.username || '';
  const initial = (name.trim()[0] || 'N').toUpperCase();
  return (
    <button
      type="button"
      className="nl-me nl-corner nl-corner-r"
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label="Your profile"
      style={{ background: sealBg(user?.sealColor) }}
    >
      {initial}
      {user?.avatar ? <img src={user.avatar} alt="" /> : null}
    </button>
  );
}
