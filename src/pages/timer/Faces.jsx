const ROMAN = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']
const RING = 565.5 // 2πr for r = 90

/**
 * Pocket watch, exactly as in the prototype: chain, bow, crown, brass case, enamel dial
 * with Roman numerals, a minute hand and a sweeping second hand. Angles are cumulative
 * (secs/10 and secs*6 degrees) so the hands never spin backwards across twelve.
 */
export function PocketWatch({ secs }) {
  return (
    <div className="tmr-watch">
      <div className="tmr-watch-inner">
        <svg aria-hidden="true" viewBox="0 0 340 80" className="tmr-chain">
          <path d="M170 58 C 150 20, 90 10, 40 30 S -10 70, 10 76" fill="none" stroke="#a8823a" strokeWidth="3" strokeDasharray="7 3" strokeLinecap="round" />
        </svg>
        <span aria-hidden="true" className="tmr-bow" />
        <span aria-hidden="true" className="tmr-crown" />
        <div className="tmr-case">
          <div className="tmr-dial">
            <div aria-hidden="true" className="tmr-ticks" />
            {ROMAN.map((r, i) => (
              <span
                key={r}
                aria-hidden="true"
                className="tmr-numeral"
                style={{ transform: `rotate(${i * 30}deg) translateY(-112px) rotate(${-i * 30}deg)` }}
              >
                {r}
              </span>
            ))}
            <span aria-hidden="true" className="tmr-maker">
              NOCTURNE
            </span>
            <span className="nl-hand tmr-hand-min" aria-hidden="true" style={{ transform: `rotate(${secs / 10}deg)` }} />
            <span className="nl-hand tmr-hand-sec" aria-hidden="true" style={{ transform: `rotate(${secs * 6}deg)` }} />
            <span aria-hidden="true" className="tmr-pin" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** The plain ring: fills over the sitting (timer) or over each hour (stopwatch). */
export function SimpleRing({ fraction }) {
  const offset = (RING * (1 - Math.max(0, Math.min(1, fraction)))).toFixed(1)
  return (
    <div className="tmr-ring">
      <svg aria-hidden="true" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="90" fill="none" stroke="#1e2924" strokeWidth="3" />
        <circle
          className="nl-sand"
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke="#c8a050"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={RING}
          strokeDashoffset={offset}
        />
      </svg>
    </div>
  )
}
