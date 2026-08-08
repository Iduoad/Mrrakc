import type { Event } from '../../data/schema';

/**
 * Building and writing back a `data/events/<id>.json` record.
 *
 * The editor covers schema/events.json in full, so what is written here is the
 * dataset record itself — not a draft. Two rules keep the diffs honest:
 *
 * - empty optionals are dropped rather than written as `[]` or `{}`;
 * - key order follows the file being edited, so re-saving an untouched event
 *   is a no-op even for the ~35 files whose keys are not in schema order.
 */

export const EVENT_KEYS = ['version', 'kind', 'metadata', 'spec'];

export const SPEC_KEYS = [
  'name', 'id', 'description', 'status', 'host', 'recurrence',
  'admission', 'editions', 'links', 'comments',
];

export const slugify = (raw: string) =>
  raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const isValidId = (id: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);

export const PROVINCE_REF = /^province\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PLACE_REF = /^places\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A new record with the minimum the schema requires, ready to be filled in. */
export function newEvent(): Event {
  return {
    version: 'mrrakc/v0',
    kind: 'festival/music',
    spec: {
      name: '',
      id: '',
      description: '',
      status: 'active',
      host: { provinces: [] },
      recurrence: { frequency: 'annual', type: 'gregorian' },
      editions: [],
    },
  } as Event;
}

/** Empty by the standards of a JSON file: nothing worth writing a key for. */
const isEmpty = (v: unknown): boolean =>
  v === undefined || v === null
  || (typeof v === 'string' && !v.trim())
  || (Array.isArray(v) && v.filter((x) => !isEmpty(x)).length === 0)
  || (typeof v === 'object' && !Array.isArray(v) && Object.values(v as object).every(isEmpty));

/**
 * Order `value`'s keys like `original`'s, appending anything new in `canonical`
 * order, and drop the ones not worth writing.
 *
 * Two conservative rules, both there so that saving an edit to one field never
 * rewrites another: key order is inherited rather than normalised, and an
 * empty value is only dropped if the file did not already have it. Eleven
 * events carry a bare `"links": []`; that is theirs to keep.
 */
function orderLike<T extends object>(value: T, original: unknown, canonical: string[]): T {
  const source = value as Record<string, unknown>;
  const previous = (original && typeof original === 'object' && !Array.isArray(original)
    ? original
    : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const seen = new Set<string>();
  for (const key of [...Object.keys(previous), ...canonical, ...Object.keys(source)]) {
    if (seen.has(key)) continue;
    seen.add(key);
    const v = source[key];
    if (v === undefined) continue;
    if (isEmpty(v) && !(key in previous)) continue;
    out[key] = v;
  }
  return out as T;
}

const clean = <T,>(list: T[] | undefined): T[] => (list ?? []).filter((v) => !isEmpty(v));

/**
 * The record as it should hit disk: blanks stripped, list entries that were
 * added and left empty removed, key order inherited from `original`.
 */
export function cleanEvent(event: Event, original?: Event): Event {
  const spec = event.spec;

  const editions = clean(
    (spec.editions ?? [])
      .filter((e) => e.year)
      .map((e, i) => orderLike(
        {
          ...e,
          provinces: clean(e.provinces?.map((p) => p.trim())),
          places: clean(e.places?.map((p) => p.trim())),
          links: clean(e.links?.filter((l) => l.url.trim())),
        },
        original?.spec.editions?.[i],
        ['edition', 'year', 'status', 'startDate', 'endDate', 'provinces', 'places', 'links', 'notes'],
      )),
  ).sort((a, b) => a.year - b.year);

  const next: Event = {
    ...event,
    metadata: { ...event.metadata, tags: clean(event.metadata?.tags?.map((t) => t.trim())) },
    spec: {
      ...spec,
      name: spec.name.trim(),
      id: spec.id.trim(),
      description: spec.description.trim(),
      host: orderLike(
        {
          provinces: clean(spec.host.provinces?.map((p) => p.trim())),
          places: clean(spec.host.places?.map((p) => p.trim())),
        },
        original?.spec.host,
        ['provinces', 'places'],
      ),
      admission: { options: clean(spec.admission?.options).filter((o) => !isEmpty(o.title)) },
      editions,
      links: clean(spec.links?.filter((l) => l.url.trim())),
      comments: clean(spec.comments?.map((c) => c.trim())),
    },
  } as Event;

  return orderLike(
    { ...next, spec: orderLike(next.spec, original?.spec, SPEC_KEYS) },
    original,
    EVENT_KEYS,
  );
}

/** Schema-required fields that are still blank. */
export function missingRequired(event: Event): string[] {
  const gaps: string[] = [];
  const { spec } = event;
  if (!spec.name.trim()) gaps.push('name');
  if (!spec.id.trim()) gaps.push('id');
  if (!spec.description.trim()) gaps.push('description');
  if (!spec.host.provinces?.filter(Boolean).length) gaps.push('host.provinces');
  // Each recurrence branch requires its own anchor field (the `oneOf` in
  // schema/components/recurrence.json).
  const r = spec.recurrence;
  if (r.type === 'gregorian' && !r.months?.length) gaps.push('recurrence.months');
  if (r.type === 'hijri' && r.hijriMonth === undefined) gaps.push('recurrence.hijriMonth');
  if (r.type === 'seasonal' && !r.season) gaps.push('recurrence.season');
  if (r.type === 'irregular' && !r.note?.trim()) gaps.push('recurrence.note');
  return gaps;
}
