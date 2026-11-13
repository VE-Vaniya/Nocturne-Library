import { sealBg, sealFor } from './seals.js';

/**
 * Avatar — photo if present, else the initial on a wax-seal gradient.
 * Props:
 *   src       image URL / data URL (optional)
 *   name      full name (initial + fallback seal seed)
 *   seal      'oxblood'|'green'|'midnight'|'plum' (optional; else derived from name)
 *   size      px, default 46 (font size scales ≈ 0.42×)
 *   ring      CSS colour for a 2px ring (box-shadow), optional
 *   alt       img alt (default '' → avatar is decorative; print the name next to it)
 *   className / style (style merges last, so it can override boxShadow etc.)
 */
export default function Avatar({
  src: srcProp,
  photo,
  name = '',
  seal,
  size = 46,
  ring,
  alt = '',
  className = '',
  style,
}) {
  const src = srcProp ?? photo;
  const initial = ((name || '').trim()[0] || '?').toUpperCase();
  return (
    <span
      className={`nl-avatar ${className}`}
      aria-hidden={alt ? undefined : true}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: sealBg(seal || sealFor(name || '')),
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
        ...style,
      }}
    >
      {initial}
      {src ? <img src={src} alt="" /> : null}
    </span>
  );
}
