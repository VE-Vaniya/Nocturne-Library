import { useApp, PAGES } from '../../context/AppContext.jsx';
import WheelMenu, { MeButton } from './WheelMenu.jsx';
import useNotifications from './useNotifications.jsx';
import OverlayHost from './OverlayHost.jsx';
import Gate from './Gate.jsx';

/** Page swing along the arc: inactive pages rotate about a point 2100px above the stage. */
function panel(i, current) {
  const d = i - current;
  const on = d === 0;
  return {
    className: on ? 'nl-page on' : 'nl-page',
    style: {
      transform: `rotate(${-Math.max(-1.5, Math.min(1.5, d)) * 24}deg)`,
      opacity: on ? 1 : 0,
      visibility: on ? 'visible' : 'hidden',
    },
  };
}

/**
 * Full-viewport, non-scrolling app frame.
 * Props: pages [{ name, label, aria, Component }] in wheel order (all stay mounted).
 */
export default function Shell({ pages }) {
  const { user, page, go, toastState } = useApp();
  const { bell, panel: notifPanel } = useNotifications();
  const current = Math.max(0, PAGES.indexOf(page));

  return (
    <div className="nl-root">
      <div className="nl-root-glow nl-glow" aria-hidden="true" />

      <WheelMenu
        tabs={pages}
        pageIndex={current}
        onGo={(i) => go(pages[i].name)}
        bell={bell}
        me={<MeButton user={user} onClick={() => go('profile')} />}
      />
      <div className="nl-pool" aria-hidden="true" />

      {notifPanel}

      <main className="nl-main" inert={!user}>
        {pages.map((pg, i) => {
          const { name, aria, Component: PageComponent } = pg;
          const p = panel(i, current);
          const active = i === current;
          return (
            <section
              key={name}
              aria-label={aria}
              aria-hidden={!active}
              className={p.className}
              style={p.style}
            >
              <PageComponent active={active} />
            </section>
          );
        })}
      </main>

      <OverlayHost />

      {toastState ? (
        <div key={toastState.key} className="nl-toast nl-toastbox" aria-hidden="true">
          {toastState.message}
        </div>
      ) : null}
      <div className="nl-sr" role="status" aria-live="polite">
        {toastState?.message || ''}
      </div>

      <Gate />
    </div>
  );
}
