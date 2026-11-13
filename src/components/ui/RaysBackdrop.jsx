/**
 * RaysBackdrop — the slowly rotating radiant rays (+ warm halo) behind a held-up quote
 * card or the "Well read." celebration. Render it as the first child of a
 * position:relative container; it is aria-hidden and pointer-events:none.
 * Props:
 *   variant  'quote' (1100px rays + 620px halo, centred at 44%) | 'celebration' (1300px, centred at 40%)
 *   top      override the vertical centre (CSS length, e.g. '44%')
 */
const V = {
  quote: {
    size: 1100,
    top: '44%',
    bg: 'repeating-conic-gradient(from 0deg,rgba(255,214,140,0) 0deg,rgba(255,214,140,.28) 1.2deg,rgba(255,214,140,0) 2.6deg,rgba(255,214,140,0) 7deg)',
    mask: 'radial-gradient(circle,transparent 16%,#000 30%,rgba(0,0,0,.4) 46%,transparent 64%)',
    halo: 620,
  },
  celebration: {
    size: 1300,
    top: '40%',
    bg: 'repeating-conic-gradient(from 0deg,rgba(255,214,140,0) 0deg,rgba(255,214,140,.34) 1.4deg,rgba(255,214,140,0) 3deg,rgba(255,214,140,0) 9deg)',
    mask: 'radial-gradient(circle,transparent 6%,#000 18%,rgba(0,0,0,.35) 40%,transparent 60%)',
    halo: 0,
  },
};

export default function RaysBackdrop({ variant = 'quote', top }) {
  const v = V[variant] || V.quote;
  const t = top || v.top;
  return (
    <>
      <div
        className="nl-rays nl-raysbox"
        aria-hidden="true"
        style={{
          top: t,
          width: v.size,
          height: v.size,
          margin: `${-v.size / 2}px 0 0 ${-v.size / 2}px`,
          background: v.bg,
          WebkitMaskImage: v.mask,
          maskImage: v.mask,
        }}
      />
      {v.halo ? (
        <div
          className="nl-raysbox"
          aria-hidden="true"
          style={{
            top: t,
            width: v.halo,
            height: v.halo,
            margin: `${-v.halo / 2}px 0 0 ${-v.halo / 2}px`,
            background: 'radial-gradient(circle,rgba(233,199,121,.22),transparent 62%)',
          }}
        />
      ) : null}
    </>
  );
}
