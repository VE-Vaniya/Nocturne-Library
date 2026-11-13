/**
 * Button — the prototype's pill buttons.
 * Props:
 *   variant  'solid' (brass fill, .nl-btn hover) | 'ghost' (brass outline, .nl-ghost hover). Default 'solid'.
 *   size     'sm' (36px) | 'md' (44px, default) | 'lg' (50px).
 *   block    boolean — full width.
 *   onVeil   boolean — ghost gets a dark translucent fill (used over the modal veil).
 *   type     defaults to 'button'.
 *   ...rest  any <button> props (onClick, disabled, aria-*, style, className).
 */
export default function Button({ variant = 'solid', size = 'md', block = false, onVeil = false, className = '', type = 'button', children, ...rest }) {
  const cls = [
    'nl-b',
    `nl-b--${variant}`,
    `nl-b--${size}`,
    variant === 'solid' ? 'nl-btn' : 'nl-ghost',
    block ? 'nl-b--block' : '',
    onVeil ? 'nl-b--onveil' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
