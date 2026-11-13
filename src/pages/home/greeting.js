/** Public-domain fallback quotes for readers who haven't kept any yet. */
export const PUBLIC_QUOTES = [
  { text: 'We are all in the gutter, but some of us are looking at the stars.', author: 'Oscar Wilde' },
  { text: 'I am no bird; and no net ensnares me.', author: 'Charlotte Brontë' },
  { text: 'Whatever our souls are made of, his and mine are the same.', author: 'Emily Brontë' },
  { text: 'Beware; for I am fearless, and therefore powerful.', author: 'Mary Shelley' },
  { text: 'The mind is its own place, and in itself can make a Heaven of Hell, a Hell of Heaven.', author: 'John Milton' },
];

export function greetingFor(hour) {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}
