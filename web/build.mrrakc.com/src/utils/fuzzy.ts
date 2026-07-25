// Tiny dependency-free fuzzy matcher. Scores how well `query` matches `text`
// as an ordered subsequence, rewarding contiguous runs and start-of-word hits.
// Returns null when the query characters do not all appear in order.
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (!q) return 0;
  if (!t) return null;

  let score = 0;
  let ti = 0;
  let prevMatchIdx = -2;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    const found = t.indexOf(ch, ti);
    if (found === -1) return null;
    // Reward matches adjacent to the previous one (contiguous run).
    if (found === prevMatchIdx + 1) score += 5;
    // Reward matches at the start of a word.
    if (found === 0 || t[found - 1] === ' ' || t[found - 1] === '-') score += 3;
    score += 1;
    prevMatchIdx = found;
    ti = found + 1;
  }
  // Prefer shorter targets (a tighter match).
  score -= t.length * 0.01;
  return score;
}

export interface FuzzyResult<T> {
  item: T;
  score: number;
}

// Rank `items` against `query` using each item's `key`. Highest score first.
export function fuzzySearch<T>(
  query: string,
  items: T[],
  key: (item: T) => string,
  limit = 20,
): FuzzyResult<T>[] {
  const results: FuzzyResult<T>[] = [];
  for (const item of items) {
    const score = fuzzyScore(query, key(item));
    if (score !== null) results.push({ item, score });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
