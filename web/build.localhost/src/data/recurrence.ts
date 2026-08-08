import type { Event } from './schema';
import { RECURRENCE_PARTS } from './schema';

/**
 * The shape of `spec.recurrence` and the rules about its calendar branches.
 *
 * Kept apart from the tools because more than one of them edits a recurrence:
 * Recurrence Review checks a stored one, New Event authors one from scratch.
 * Both go through the same form and the same branch rules.
 */

export type Recurrence = Event['spec']['recurrence'];
export type Part = (typeof RECURRENCE_PARTS)[number];

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December',
];

export const monthLabel = (m: number) => MONTH_NAMES[m - 1] ?? `?${m}`;

/**
 * Fields each calendar type owns. `recurrence` in schema/components/recurrence.json
 * is a `oneOf` over these branches, so a record should only ever carry the set
 * belonging to its own `type`.
 */
export const BRANCH_FIELDS: Record<Recurrence['type'], (keyof Recurrence)[]> = {
  gregorian: ['months', 'part'],
  hijri: ['hijriMonth', 'hijriDay', 'observance'],
  seasonal: ['season'],
  irregular: [],
};

/**
 * Field order a rebuilt recurrence is written in — the branch's own fields sit
 * between the header and the shared tail, matching how the dataset files are
 * already laid out. Rebuilding in this order keeps a type change from showing
 * up in the diff as a reshuffle.
 */
const fieldOrder = (type: Recurrence['type']): (keyof Recurrence)[] => [
  'frequency', 'type', ...BRANCH_FIELDS[type], 'typicalDurationDays', 'note', 'urls',
];

/** Fields present that belong to some branch other than the declared type. */
export function strayFields(r: Recurrence): (keyof Recurrence)[] {
  const own = new Set<string>(BRANCH_FIELDS[r.type] ?? []);
  return (Object.keys(BRANCH_FIELDS) as Recurrence['type'][])
    .flatMap((type) => BRANCH_FIELDS[type])
    .filter((field, i, all) => all.indexOf(field) === i)
    .filter((field) => !own.has(field) && r[field] !== undefined);
}

/**
 * Rebuild a recurrence for `type`, keeping the shared fields and the new
 * branch's own, and dropping everything the old branch left behind. Switching
 * hijri → gregorian must not leave a stray `hijriMonth` in the file.
 */
export function pruneToType(r: Recurrence, type: Recurrence['type']): Recurrence {
  const next: Record<string, unknown> = {};
  for (const field of fieldOrder(type)) {
    if (field === 'type') next.type = type;
    else if (r[field] !== undefined) next[field] = r[field];
  }
  return next as Recurrence;
}
