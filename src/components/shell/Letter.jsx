import { useId } from 'react';
import Button from '../ui/Button.jsx';

const FOLDS = [
  { cls: 'nl-fold-mid', hidden: false, clip: 'inset(33.3% -8% 33.3% -8%)', origin: '50% 50%', shade: 'nl-shade-mid' },
  { cls: 'nl-fold-bot', hidden: true, clip: 'inset(66.6% -8% -8% -8%)', origin: '50% 66.66%', shade: 'nl-shade-bot' },
  { cls: 'nl-fold-top', hidden: true, clip: 'inset(-8% -8% 66.7% -8%)', origin: '50% 33.33%', shade: 'nl-shade-top' },
];

/**
 * Burnt-parchment letter that unfolds in three panels (prototype "paper" modal).
 * Props: from, salute, body, source, sign, saveLabel?, onSave?, saveDisabled?, onClose
 * SVG filter/mask ids are made unique per mount with useId.
 */
export default function Letter({ from, salute, body, source, sign, saveLabel, onSave, saveDisabled, onClose }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const long = (body || '').length > 260;
  return (
    <div className="nl-letter-wrap" role="dialog" aria-modal="true" aria-label={`Letter from ${from}`}>
      <div className="nl-letter">
        {FOLDS.map((f, i) => {
          const id = (k) => `nl${uid}f${i}${k}`;
          return (
            <div key={f.cls} className={`nl-letter-fold ${f.cls}`} aria-hidden={f.hidden} style={{ clipPath: f.clip, transformOrigin: f.origin }}>
              <svg aria-hidden="true" viewBox="0 0 500 620" preserveAspectRatio="none">
                <defs>
                  <filter id={id('burn')} x="-15%" y="-15%" width="130%" height="130%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.024" numOctaves="4" seed="9" result="n" />
                    <feDisplacementMap in="SourceGraphic" in2="n" scale="38" xChannelSelector="R" yChannelSelector="G" />
                  </filter>
                  <filter id={id('streak')} x="0" y="0" width="100%" height="100%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.006 0.11" numOctaves="3" seed="3" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.12  0 0 0 0 0.05  1.7 0 0 0 -0.65" />
                  </filter>
                  <radialGradient id={id('parch')} cx="50%" cy="46%" r="68%">
                    <stop offset="0%" stopColor="#d9c79c" />
                    <stop offset="55%" stopColor="#c4a874" />
                    <stop offset="84%" stopColor="#9c7744" />
                    <stop offset="100%" stopColor="#4f3115" />
                  </radialGradient>
                  <mask id={id('mask')}>
                    <rect x="26" y="26" width="448" height="568" fill="#fff" filter={`url(#${id('burn')})`} />
                  </mask>
                </defs>
                <rect x="14" y="14" width="472" height="592" fill="#1a0d05" filter={`url(#${id('burn')})`} />
                <g mask={`url(#${id('mask')})`}>
                  <rect x="0" y="0" width="500" height="620" fill={`url(#${id('parch')})`} />
                  <rect x="0" y="0" width="500" height="620" filter={`url(#${id('streak')})`} opacity=".6" />
                </g>
              </svg>
              <div className="nl-letter-text">
                {salute ? <p className="nl-letter-salute">{salute}</p> : null}
                <p className={`nl-letter-body${long ? ' is-long' : ''}`}>{body}</p>
                {source ? <p className="nl-letter-source">{source}</p> : null}
                <p className="nl-letter-sign">{sign}</p>
              </div>
              <div className={`nl-letter-shade ${f.shade}`} />
            </div>
          );
        })}
        <div className="nl-letter-crease nl-crease" aria-hidden="true" style={{ top: '33.33%' }} />
        <div className="nl-letter-crease nl-crease" aria-hidden="true" style={{ top: '66.66%' }} />
      </div>
      <div className="nl-letter-actions">
        {onSave ? (
          <Button onClick={onSave} disabled={saveDisabled}>
            {saveLabel}
          </Button>
        ) : null}
        <Button variant="ghost" onVeil onClick={onClose} data-autofocus>
          Close
        </Button>
      </div>
    </div>
  );
}
