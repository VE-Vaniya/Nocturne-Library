import { clothFor } from '../../components/ui/bookStyle'

/** One cloth-bound spine, ported from the prototype's shelf (4 ornament variants, lean, depth). */
export default function BookSpine({ book, lean, onPick }) {
  const cloth = clothFor(book.title)
  const ink = cloth.ink
  const v = cloth.variant
  return (
    <button
      type="button"
      className="nl-spine shv-spine"
      onClick={onPick}
      aria-label={`${book.title} by ${book.author}`}
      style={{
        '--h': cloth.height,
        '--w': cloth.width,
        transform: `rotate(${lean})`,
        backgroundColor: cloth.color,
        color: ink,
      }}
    >
      {v === 0 && (
        <>
          <span aria-hidden="true" className="shv-orn shv-orn-bands shv-orn-top" style={{ borderColor: ink }} />
          <span aria-hidden="true" className="shv-orn shv-orn-bands shv-orn-bot" style={{ borderColor: ink }} />
        </>
      )}
      {v === 1 && <span aria-hidden="true" className="shv-orn shv-orn-label" style={{ borderColor: ink }} />}
      {v === 2 && <span aria-hidden="true" className="shv-orn shv-orn-ribs" />}
      {v === 3 && (
        <>
          <span aria-hidden="true" className="shv-orn shv-orn-dia shv-orn-dia-top" style={{ borderColor: ink }} />
          <span aria-hidden="true" className="shv-orn shv-orn-dia shv-orn-dia-bot" style={{ background: ink }} />
        </>
      )}
      <span className="shv-spine-title">{book.title}</span>
    </button>
  )
}
