/**
 * Book cloth helpers shared by Home and Shelves.
 * clothFor(title) → { color, ink, variant: 0-3, height, width } — deterministic from a
 * hash of the title; colours come from the prototype's BOOKS palette (cloth + matching ink).
 *   height: spine height in px (146–200), width: spine thickness in px (24–64).
 * coverBackground(color) → CSS background for a flat cloth front cover.
 */
export const CLOTH = [
  ['#3b1d22', '#e9cf8f'],
  ['#1f2a3a', '#d9c08a'],
  ['#2e3a2a', '#e2cf9a'],
  ['#2f4a3b', '#ecd59b'],
  ['#4a3420', '#efd9a6'],
  ['#5a2a2a', '#ecd59b'],
  ['#2b2b33', '#cfc3a0'],
  ['#3a2f45', '#e5cf9e'],
  ['#262d27', '#d8c38f'],
  ['#33404a', '#e3d3a8'],
  ['#3a3a2a', '#e0cc96'],
  ['#2a1f1a', '#d6b46a'],
  ['#41452f', '#e8d6a0'],
  ['#e2d6ba', '#3a2a1a'],
  ['#5e1f2a', '#f0d7a2'],
  ['#24343a', '#e0c98e'],
  ['#2c2238', '#e6cf98'],
  ['#3d3524', '#ead6a0'],
  ['#6b5a3e', '#f4e6c0'],
  ['#46303a', '#ecd59b'],
  ['#1d2622', '#d6c08c'],
  ['#141414', '#c9b27a'],
  ['#3a2618', '#e1c78c'],
  ['#304433', '#e8d3a0'],
];

/** FNV-1a 32-bit hash (unsigned). */
export function hashString(s = '') {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function clothFor(title = '') {
  const h = hashString(
    String(title || '')
      .trim()
      .toLowerCase(),
  );
  const [color, ink] = CLOTH[h % CLOTH.length];
  return {
    color,
    ink,
    variant: (h >>> 5) % 4,
    height: 146 + ((h >>> 8) % 55),
    width: 24 + ((h >>> 14) % 41),
  };
}

export function coverBackground(color) {
  return `linear-gradient(90deg,rgba(0,0,0,.45),rgba(255,255,255,.06) 12%,rgba(0,0,0,0) 30%),linear-gradient(160deg,${color},color-mix(in srgb,${color} 45%,#000))`;
}
