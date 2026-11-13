/**
 * Tabs — underline tab strip (shelf filters, Find's Books/People).
 * Props:
 *   options   [{ value, label, count? }]  — count renders as the small grey number
 *   value     selected value
 *   onChange  (value) => void
 *   label     aria-label of the tablist, required
 *   size      'md' (16px, default) | 'lg' (17px)
 *   idBase    optional prefix; tabs get id `${idBase}-${value}` and aria-controls `${idBase}-panel`
 * Arrow Left/Right moves between tabs.
 */
export default function Tabs({ options, value, onChange, label, size = 'md', idBase, className = '' }) {
  const onKeyDown = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = options.findIndex((o) => o.value === value);
    const n = options[(i + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length];
    onChange(n.value);
    const btns = e.currentTarget.querySelectorAll('[role="tab"]');
    const idx = options.indexOf(n);
    if (btns[idx]) btns[idx].focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`nl-tabs ${size === 'lg' ? 'nl-tabs--lg' : ''} ${className}`}
      onKeyDown={onKeyDown}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            id={idBase ? `${idBase}-${o.value}` : undefined}
            aria-controls={idBase ? `${idBase}-panel` : undefined}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className="nl-tabs__tab"
            onClick={() => onChange(o.value)}
          >
            {o.label}
            {o.count != null ? (
              <>
                {' '}
                <span className="nl-tabs__count">{o.count}</span>
              </>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
