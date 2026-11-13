// Reading streaks are counted in UTC calendar days: a day "counts" when the
// user logged at least one reading session (PUT /api/users/reading-stats)
// between 00:00 and 23:59:59 UTC. The streak is the number of consecutive
// such days ending today or yesterday; a gap of a full UTC day resets it.

const DAY_MS = 24 * 60 * 60 * 1000;

const utcDay = (date) => Math.floor(new Date(date).getTime() / DAY_MS);

// Streak after logging a session at `now`.
const nextStreak = (lastReadDate, currentStreak, now = new Date()) => {
  const today = utcDay(now);
  if (!lastReadDate) return 1;
  const last = utcDay(lastReadDate);
  if (last === today) return Math.max(1, currentStreak || 0);
  if (last === today - 1) return (currentStreak || 0) + 1;
  return 1;
};

// Streak as displayed at `now`: still alive if the last session was today
// or yesterday, otherwise broken (0).
const effectiveStreak = (lastReadDate, currentStreak, now = new Date()) => {
  if (!lastReadDate) return 0;
  const diff = utcDay(now) - utcDay(lastReadDate);
  return diff <= 1 ? currentStreak || 0 : 0;
};

module.exports = { utcDay, nextStreak, effectiveStreak, DAY_MS };
