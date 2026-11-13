/**
 * ScrollArea — vertical scroll container with the themed thin scrollbar
 * (dark track, brass thumb; both scrollbar-color and ::-webkit-scrollbar) and contained overscroll.
 * Props:
 *   maxHeight  CSS length (optional; otherwise size it via a parent grid/flex row — minHeight 0 is set)
 *   as         tag, default 'div'
 *   className / style / ...rest (role, aria-label, tabIndex…)
 */
export default function ScrollArea({ maxHeight, as = 'div', className = '', style, children, ...rest }) {
  const Tag = as;
  return (
    <Tag className={`nl-scroll ${className}`} style={{ maxHeight, minHeight: 0, ...style }} {...rest}>
      {children}
    </Tag>
  );
}
