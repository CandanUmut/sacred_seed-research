export interface RatingResult {
  playerId: string;
  previous: number;
  next: number;
  delta: number;
}

const K_BASE = 32;
const MIN_RATING = 500;
const MAX_RATING = 3000;

export function updateRatings(placements: Array<{ playerId: string; rating: number; place: number }>): RatingResult[] {
  if (placements.length < 2) {
    return placements.map((entry) => ({
      playerId: entry.playerId,
      previous: entry.rating,
      next: entry.rating,
      delta: 0,
    }));
  }

  const total = placements.length;
  const expected = new Map<string, number>();
  for (const a of placements) {
    let sum = 0;
    for (const b of placements) {
      if (a.playerId === b.playerId) continue;
      const diff = b.rating - a.rating;
      sum += 1 / (1 + 10 ** (diff / 400));
    }
    expected.set(a.playerId, sum / (total - 1));
  }

  const maxPlace = Math.max(...placements.map((p) => p.place));
  const results: RatingResult[] = [];
  for (const entry of placements) {
    const score = 1 - (entry.place - 1) / Math.max(1, maxPlace - 1);
    const exp = expected.get(entry.playerId) ?? 0.5;
    const delta = Math.round(K_BASE * (score - exp));
    const next = clamp(entry.rating + delta, MIN_RATING, MAX_RATING);
    results.push({
      playerId: entry.playerId,
      previous: entry.rating,
      next,
      delta: next - entry.rating,
    });
  }
  return results;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
