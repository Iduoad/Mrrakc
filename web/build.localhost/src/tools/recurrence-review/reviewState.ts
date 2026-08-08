import type { Finding } from './analyze';

/**
 * Which events a maintainer has already looked at and signed off on.
 *
 * A reviewed event keeps its findings — being reviewed means "I have seen
 * these and they are acceptable", not "these are resolved". It just stops
 * competing for attention in the flagged lists.
 */

export interface ReviewMark {
  reviewedAt: string;
  /**
   * The findings that were on screen when the event was signed off, as
   * `id:severity`. Anything outside this set later means something new came up.
   */
  acknowledged: string[];
}

export interface ReviewState {
  version: 1;
  events: Record<string, ReviewMark>;
}

export const emptyReviewState = (): ReviewState => ({ version: 1, events: {} });

export const findingKey = (f: Finding) => `${f.id}:${f.severity}`;

export type ReviewStatus = 'unreviewed' | 'reviewed' | 'stale';

/**
 * Sign-off covers the findings acknowledged at the time, so later *fixing*
 * things keeps the event reviewed — the finding set only shrinks. A finding
 * that was not acknowledged, or that got more severe, makes the mark stale and
 * puts the event back in front of the reviewer.
 */
export function reviewStatus(findings: Finding[], mark: ReviewMark | undefined): ReviewStatus {
  if (!mark) return 'unreviewed';
  const acknowledged = new Set(mark.acknowledged);
  return findings.every((f) => acknowledged.has(findingKey(f))) ? 'reviewed' : 'stale';
}

export function markReviewed(state: ReviewState, id: string, findings: Finding[]): ReviewState {
  return {
    ...state,
    events: {
      ...state.events,
      [id]: { reviewedAt: new Date().toISOString(), acknowledged: findings.map(findingKey) },
    },
  };
}

export function clearReviewed(state: ReviewState, id: string): ReviewState {
  const events = { ...state.events };
  delete events[id];
  return { ...state, events };
}
