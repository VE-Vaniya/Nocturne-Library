// Seal colours (prototype SEALS): key → [name, light, mid, dark]
export const SEALS = {
  oxblood: ['Oxblood', '#a8353c', '#7a2228', '#4c1216'],
  green: ['Bottle green', '#3f6b55', '#2f4a3b', '#16231c'],
  midnight: ['Midnight', '#3a4f72', '#25324a', '#111722'],
  plum: ['Plum', '#5e4a70', '#3a2f45', '#1a1420'],
};
export const SEAL_KEYS = Object.keys(SEALS);

/** CSS radial gradient for a seal key (falls back to oxblood). */
export function sealBg(key) {
  const x = SEALS[key] || SEALS.oxblood;
  return `radial-gradient(circle at 35% 30%,${x[1]},${x[2]} 55%,${x[3]})`;
}

/** Deterministic seal for someone whose seal colour we don't know (hash of a name/id). */
export function sealFor(seed = '') {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return SEAL_KEYS[Math.abs(h) % SEAL_KEYS.length];
}
