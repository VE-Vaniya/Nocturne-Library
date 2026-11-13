import { useApp } from '../../context/AppContext.jsx';

/**
 * Modal — panel wrapper to pass to openModal(). Pops in with .nl-pop.
 * The overlay host (shell) supplies the veil, click-outside, Escape and focus handling.
 * Props:
 *   label     dialog aria-label, required
 *   title     optional heading text, rendered with a × close button
 *   width     CSS width, default 'min(460px,92vw)'
 *   variant   'panel' (dark, default) | 'paper' (cream, like log-a-quote) | 'flush' (no padding/gap, for lists)
 *   as        tag, default 'div' (use 'form' and pass onSubmit for forms)
 *   onClose   override for the × button (defaults to closeModal)
 *   className / style / ...rest
 */
export default function Modal({
  label,
  title,
  width = 'min(460px,92vw)',
  variant = 'panel',
  as = 'div',
  onClose,
  className = '',
  style,
  children,
  ...rest
}) {
  const { closeModal } = useApp();
  const Tag = as;
  const v =
    variant === 'paper'
      ? 'nl-panel nl-panel--paper'
      : variant === 'flush'
        ? 'nl-panel nl-panel--flush'
        : 'nl-panel';
  return (
    <Tag
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className={`nl-pop ${v} ${className}`}
      style={{ width, ...style }}
      {...rest}
    >
      {title != null && (
        <div
          className="nl-panel__head"
          style={variant === 'flush' ? { padding: '16px 18px 8px' } : undefined}
        >
          <b className="nl-panel__title">{title}</b>
          <button
            type="button"
            className="nl-panel__x"
            aria-label="Close"
            onClick={onClose || closeModal}
          >
            ×
          </button>
        </div>
      )}
      {children}
    </Tag>
  );
}
