import { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext.jsx';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Renders the node passed to openModal(): dim + blur veil, click-outside to close,
 * Escape to close (listener scoped to this overlay element), focus moved in on open,
 * Tab kept inside, focus restored on close.
 */
export default function OverlayHost() {
  const { modal, closeModal } = useApp();
  const stageRef = useRef(null);
  const returnTo = useRef(null);
  const key = modal?.key;

  useEffect(() => {
    if (!key) return undefined;
    if (!returnTo.current) returnTo.current = document.activeElement;
    const stage = stageRef.current;
    const t = setTimeout(() => {
      if (!stage || stage.contains(document.activeElement)) return;
      const target =
        stage.querySelector('[data-autofocus]') ||
        stage.querySelector('input:not([type="file"]):not([type="hidden"]),textarea') ||
        stage.querySelector('[role="dialog"]') ||
        stage.querySelector(FOCUSABLE);
      if (target) {
        if (!target.hasAttribute('tabindex') && target.getAttribute('role') === 'dialog') target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    }, 30);
    return () => clearTimeout(t);
  }, [key]);

  useEffect(() => {
    if (key) return;
    const el = returnTo.current;
    returnTo.current = null;
    if (el && typeof el.focus === 'function' && document.contains(el)) el.focus({ preventScroll: true });
  }, [key]);

  if (!modal) return null;

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeModal();
      return;
    }
    if (e.key !== 'Tab') return;
    const stage = stageRef.current;
    if (!stage) return;
    const items = [...stage.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null || x === document.activeElement);
    if (!items.length) return;
    const firstEl = items[0];
    const lastEl = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === firstEl || !stage.contains(document.activeElement))) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  };

  return (
    <div className="nl-overlay" onKeyDown={onKeyDown}>
      <div className="nl-overlay__veil nl-veil" />
      <button type="button" className="nl-overlay__close" aria-label="Close" tabIndex={-1} onClick={closeModal} />
      <div className="nl-overlay__stage" ref={stageRef} key={modal.key}>
        {modal.node}
      </div>
    </div>
  );
}
