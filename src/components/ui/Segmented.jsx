/**
 * Segmented — pill toggle (Shelf/List, Timer/Stopwatch…).
 * Props:
 *   options   [{ value, label }]
 *   value     currently selected value
 *   onChange  (value) => void
 *   label     accessible group label (aria-label), required
 *   className / style  applied to the group
 */
export default function Segmented({ options, value, onChange, label, className = '', style }) {
  return (
    <div role="group" aria-label={label} className={`nl-seg ${className}`} style={style}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="nl-seg__opt"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
