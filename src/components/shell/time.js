/** Short relative time for notification rows ("just now", "2h ago", "yesterday", "Tue"). */
export function relTime(iso) {
  const t = new Date(iso).getTime();
  if (!t) return '';
  const now = new Date();
  const diff = (now.getTime() - t) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  const d = new Date(t);
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return now.getHours() >= 18 && d.getHours() >= 18 ? 'tonight' : `${Math.floor(diff / 3600)}h ago`;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'yesterday';
  if (diff < 6 * 86400) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
