import type { Edition, Event } from '../../data/schema';
import {
  FULL_MONTH_NAMES, MONTH_NAMES, monthLabel, strayFields,
  type Part, type Recurrence,
} from '../../data/recurrence';

/**
 * Checks an event's declared `spec.recurrence` against the evidence in its
 * `spec.editions`.
 *
 * Everything here is derived from dates that are already in the dataset — no
 * outside knowledge. Findings are proposals for a human to accept or reject,
 * not automatic corrections: edition dates are themselves imperfect, so a
 * finding means "these two disagree, look at it", not "the declaration is
 * wrong".
 */

// The recurrence shape and its calendar-branch rules are shared with the form
// and with the New Event tool; re-exported so this module stays the one import
// a review screen needs.
export {
  BRANCH_FIELDS, MONTH_NAMES, monthLabel, pruneToType, strayFields,
  type Part, type Recurrence,
} from '../../data/recurrence';

// Both boundaries matter: a bare `\bMar` also matches "marked" and "Marrakesh".
// The full name comes first so "January" is not left half-matched by "Jan".
const MONTH_MENTION = FULL_MONTH_NAMES.map(
  (full, i) => new RegExp(`\\b(?:${full}|${MONTH_NAMES[i]})\\b`, 'i'),
);

// --- Dates -----------------------------------------------------------------

export interface ParsedDate {
  raw: string;
  year: number;
  month: number | null;
  day: number | null;
  precision: 'year' | 'month' | 'day';
}

const DATE_RE = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;

export function parseDate(raw: string | undefined): ParsedDate | null {
  if (!raw) return null;
  const m = DATE_RE.exec(raw.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) : null;
  const day = m[3] ? Number(m[3]) : null;
  if (month !== null && (month < 1 || month > 12)) return null;
  if (day !== null && (day < 1 || day > 31)) return null;
  return {
    raw,
    year,
    month,
    day,
    precision: day !== null ? 'day' : month !== null ? 'month' : 'year',
  };
}

const epochDay = (d: ParsedDate) =>
  Date.UTC(d.year, (d.month ?? 1) - 1, d.day ?? 1) / 86_400_000;

const dayOfYear = (d: ParsedDate) =>
  epochDay(d) - Date.UTC(d.year, 0, 1) / 86_400_000 + 1;

// Every month the event touches, walking start → end so ranges that cross a
// year boundary (late December into January) are covered.
function monthsTouched(start: ParsedDate | null, end: ParsedDate | null): number[] {
  if (!start?.month) return end?.month ? [end.month] : [];
  if (!end?.month || epochDay(end) < epochDay(start)) return [start.month];
  const out: number[] = [];
  let { year, month } = { year: start.year, month: start.month };
  // Bounded so malformed data can never spin here.
  for (let i = 0; i < 24; i++) {
    out.push(month);
    if (year === end.year && month === end.month) break;
    if (++month > 12) { month = 1; year++; }
  }
  return [...new Set(out)];
}

// --- Per-edition facts -----------------------------------------------------

export interface EditionFacts {
  year: number;
  cancelled: boolean;
  start: ParsedDate | null;
  end: ParsedDate | null;
  /** Inclusive length, only when both ends are known to the day. */
  durationDays: number | null;
  months: number[];
  /** Day of year of the start, used to detect hijri drift. */
  startDayOfYear: number | null;
  /** Data problems in the edition itself. */
  problems: string[];
}

export function editionFacts(edition: Edition): EditionFacts {
  const start = parseDate(edition.startDate);
  const end = parseDate(edition.endDate);
  const problems: string[] = [];

  if (edition.startDate && !start) problems.push(`unparseable startDate "${edition.startDate}"`);
  if (edition.endDate && !end) problems.push(`unparseable endDate "${edition.endDate}"`);
  if (start && end && epochDay(end) < epochDay(start)) problems.push('endDate is before startDate');
  if (start && start.year !== edition.year) {
    problems.push(`startDate year ${start.year} does not match edition year ${edition.year}`);
  }

  let durationDays: number | null = null;
  if (start?.precision === 'day' && end?.precision === 'day') {
    const span = epochDay(end) - epochDay(start) + 1;
    if (span > 0 && span <= 366) durationDays = span;
  }

  return {
    year: edition.year,
    cancelled: edition.status === 'cancelled',
    start,
    end,
    durationDays,
    months: monthsTouched(start, end),
    startDayOfYear: start?.precision === 'day' ? dayOfYear(start) : null,
    problems,
  };
}

// --- Small statistics helpers ----------------------------------------------

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Most common value, ties broken by the smaller value for stability.
function mode(values: number[]): number | null {
  if (!values.length) return null;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

// --- Aggregate evidence ----------------------------------------------------

/** Day-of-month ranges each `part` value claims. */
const PART_RANGES: Record<Part, [number, number]> = {
  early: [1, 10],
  mid: [11, 20],
  late: [21, 31],
  'first-half': [1, 15],
  'second-half': [16, 31],
  full: [1, 31],
};

// Narrowest first, so the suggested part is the tightest one that still covers
// every observed start day.
const PART_ORDER: Part[] = ['early', 'mid', 'late', 'first-half', 'second-half', 'full'];

export interface Evidence {
  editions: EditionFacts[];
  /** Held (non-cancelled) years, ascending and de-duplicated. */
  heldYears: number[];
  cancelledYears: number[];
  /** Year-to-year gaps, discounting cancelled years in between. */
  intervals: number[];
  dominantInterval: number | null;
  /** Share of intervals equal to the dominant one. */
  intervalConsistency: number;
  /** Gaps larger than the dominant interval and not explained by cancellations. */
  unexplainedGaps: { from: number; to: number }[];
  /**
   * Month → years the event *started* in. The start month is unambiguous, so
   * this is what `months` is judged against.
   */
  startMonths: Map<number, number[]>;
  /** Month → years the event overlapped at all, including days it ran into. */
  touchedMonths: Map<number, number[]>;
  datedEditions: number;
  startDays: number[];
  durations: number[];
  medianDuration: number | null;
  /** Year-on-year shifts of the start date, in days, one per consecutive pair. */
  drifts: number[];
  /** Median year-on-year shift of the start date, in days. */
  medianDrift: number | null;
  /** Years carrying more than one edition entry. */
  duplicateYears: number[];
}

export function gatherEvidence(event: Event): Evidence {
  const editions = (event.spec.editions ?? []).map(editionFacts);

  const heldYears = [...new Set(editions.filter((e) => !e.cancelled).map((e) => e.year))]
    .sort((a, b) => a - b);
  const cancelledYears = [...new Set(editions.filter((e) => e.cancelled).map((e) => e.year))]
    .sort((a, b) => a - b);
  const cancelledSet = new Set(cancelledYears);

  // A year that was explicitly cancelled is not evidence of a different cadence,
  // so discount it from the gap it creates.
  const intervals: number[] = [];
  for (let i = 1; i < heldYears.length; i++) {
    const [from, to] = [heldYears[i - 1], heldYears[i]];
    let skipped = 0;
    for (let y = from + 1; y < to; y++) if (cancelledSet.has(y)) skipped++;
    intervals.push(to - from - skipped);
  }

  const dominantInterval = mode(intervals);
  const intervalConsistency = intervals.length
    ? intervals.filter((i) => i === dominantInterval).length / intervals.length
    : 0;

  const unexplainedGaps: { from: number; to: number }[] = [];
  for (let i = 1; i < heldYears.length; i++) {
    if (dominantInterval !== null && intervals[i - 1] > dominantInterval) {
      unexplainedGaps.push({ from: heldYears[i - 1], to: heldYears[i] });
    }
  }

  const startMonths = new Map<number, number[]>();
  const touchedMonths = new Map<number, number[]>();
  const record = (map: Map<number, number[]>, month: number, year: number) => {
    const years = map.get(month);
    if (years) years.push(year); else map.set(month, [year]);
  };
  let datedEditions = 0;
  for (const e of editions) {
    if (!e.months.length) continue;
    datedEditions++;
    if (e.start?.month) record(startMonths, e.start.month, e.year);
    for (const m of e.months) record(touchedMonths, m, e.year);
  }

  const startDays = editions
    .filter((e) => e.start?.precision === 'day')
    .map((e) => e.start!.day!);
  const durations = editions.filter((e) => e.durationDays).map((e) => e.durationDays!);

  // Year-on-year movement of the start date. Gregorian events hold roughly
  // still; hijri events slide ~11 days earlier each year.
  const drifts: number[] = [];
  const byYear = new Map<number, EditionFacts>();
  for (const e of editions) if (e.startDayOfYear !== null) byYear.set(e.year, e);
  for (const [year, e] of byYear) {
    const prev = byYear.get(year - 1);
    if (!prev) continue;
    let drift = e.startDayOfYear! - prev.startDayOfYear!;
    // An event near a year boundary can wrap; take the shorter way round.
    if (drift > 182) drift -= 365;
    if (drift < -182) drift += 365;
    drifts.push(drift);
  }

  const yearTally = new Map<number, number>();
  for (const e of editions) yearTally.set(e.year, (yearTally.get(e.year) ?? 0) + 1);
  const duplicateYears = [...yearTally.entries()]
    .filter(([, n]) => n > 1)
    .map(([year]) => year)
    .sort((a, b) => a - b);

  return {
    editions,
    heldYears,
    cancelledYears,
    intervals,
    dominantInterval,
    intervalConsistency,
    unexplainedGaps,
    startMonths,
    touchedMonths,
    datedEditions,
    startDays,
    durations,
    medianDuration: median(durations),
    drifts,
    medianDrift: median(drifts),
    duplicateYears,
  };
}

/**
 * Start months seen often enough to look deliberate. One-off outliers (an
 * event that shifted once and moved back) fall below the threshold.
 */
export function typicalMonths(ev: Evidence): number[] {
  if (!ev.startMonths.size) return [];
  const threshold = Math.max(2, ev.datedEditions * 0.2);
  const frequent = [...ev.startMonths.entries()]
    .filter(([, years]) => years.length >= threshold)
    .map(([month]) => month);
  // A young event may have no month reaching the threshold; fall back to all.
  return (frequent.length ? frequent : [...ev.startMonths.keys()]).sort((a, b) => a - b);
}

/** Months the event only ever runs *into*, never starts in. */
function spilloverMonths(ev: Evidence): number[] {
  const threshold = Math.max(2, ev.datedEditions * 0.2);
  return [...ev.touchedMonths.entries()]
    .filter(([month, years]) => !ev.startMonths.has(month) && years.length >= threshold)
    .map(([month]) => month)
    .sort((a, b) => a - b);
}

// "Oct (2023, 2024)" — the years make a shifted event obvious at a glance.
const withYears = (month: number, years: number[] | undefined) =>
  `${monthLabel(month)}${years?.length ? ` (${[...years].sort().join(', ')})` : ''}`;

/** Narrowest `part` whose day range covers every observed start day. */
export function suggestedPart(startDays: number[]): Part | null {
  if (!startDays.length) return null;
  return PART_ORDER.find((part) => {
    const [lo, hi] = PART_RANGES[part];
    return startDays.every((d) => d >= lo && d <= hi);
  }) ?? 'full';
}

const SEASON_MONTHS: Record<string, number[]> = {
  winter: [12, 1, 2],
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  autumn: [9, 10, 11],
};

function seasonForMonths(months: number[]): string | null {
  if (!months.length) return null;
  const scores = Object.entries(SEASON_MONTHS).map(([season, ms]) => ({
    season,
    hits: months.filter((m) => ms.includes(m)).length,
  }));
  scores.sort((a, b) => b.hits - a.hits);
  // Ambiguous when the top two seasons are equally represented.
  if (scores[0].hits === 0 || scores[0].hits === scores[1].hits) return null;
  return scores[0].season;
}

// --- Findings --------------------------------------------------------------

export type Severity = 'error' | 'warning' | 'info';

export interface Finding {
  id: string;
  severity: Severity;
  /** Recurrence field the finding is about, for highlighting in the form. */
  field: keyof Recurrence | 'editions';
  message: string;
  /** The evidence behind the message. */
  detail: string;
  /** A one-click correction, when the evidence supports a specific value. */
  fix?: { label: string; patch: Partial<Recurrence> };
}

const MIN_INTERVALS_FOR_FREQUENCY = 3;
const MIN_DRIFTS_FOR_CALENDAR = 3;
/**
 * Share of year-on-year shifts that must agree before a calendar is inferred.
 * Claiming an event is secretly lunar needs strong agreement, since plenty of
 * gregorian events drift for a year or two by coincidence. The other direction
 * needs less: an event *declared* hijri whose dates mostly stay put contradicts
 * its own declaration, and only four events in the dataset declare hijri at all.
 */
const DRIFT_AGREEMENT_LUNAR = 0.7;
const DRIFT_AGREEMENT_FIXED = 0.6;

/** Days a lunar year falls short of a Gregorian one. */
const HIJRI_DRIFT_PER_YEAR = 11;
const MIN_EDITIONS_FOR_SWEEP = 6;
const MIN_SPAN_FOR_SWEEP = 6;
/** How much of the expected sweep must be missing before it counts as "stuck". */
const SWEEP_TOLERANCE = 0.4;

export function analyze(event: Event): { evidence: Evidence; findings: Finding[] } {
  const ev = gatherEvidence(event);
  const r = event.spec.recurrence;
  const findings: Finding[] = [];
  const months = typicalMonths(ev);

  // 1. The branch fields the JSON Schema requires for the declared type.
  if (r.type === 'gregorian' && !r.months?.length) {
    findings.push({
      id: 'months-missing', severity: 'error', field: 'months',
      message: 'Gregorian recurrence has no months',
      detail: 'schema/components/recurrence.json requires `months` when type is gregorian.',
      fix: months.length
        ? { label: `Set months to ${months.map((m) => monthLabel(m)).join(', ')}`, patch: { months } }
        : undefined,
    });
  }
  if (r.type === 'hijri' && !r.hijriMonth) {
    findings.push({
      id: 'hijri-month-missing', severity: 'error', field: 'hijriMonth',
      message: 'Hijri recurrence has no hijriMonth',
      detail: 'schema/components/recurrence.json requires `hijriMonth` when type is hijri.',
    });
  }
  if (r.type === 'seasonal' && !r.season) {
    const season = seasonForMonths(months);
    findings.push({
      id: 'season-missing', severity: 'error', field: 'season',
      message: 'Seasonal recurrence has no season',
      detail: 'schema/components/recurrence.json requires `season` when type is seasonal.',
      fix: season
        ? { label: `Set season to ${season}`, patch: { season: season as Recurrence['season'] } }
        : undefined,
    });
  }
  if (r.type === 'irregular' && !r.note?.trim()) {
    findings.push({
      id: 'note-missing', severity: 'error', field: 'note',
      message: 'Irregular recurrence has no note',
      detail: 'schema/components/recurrence.json requires `note` when type is irregular, since nothing else describes the pattern.',
    });
  }

  // 2. Fields that belong to a different branch than the declared type.
  const stray = strayFields(r);
  if (stray.length) {
    findings.push({
      id: 'stray-fields', severity: 'warning', field: 'type',
      message: `Fields left over from another calendar type: ${stray.join(', ')}`,
      detail:
        `type is "${r.type}", so these belong to a different branch of the recurrence schema ` +
        'and describe a schedule this event no longer claims to follow.',
      fix: {
        label: `Remove ${stray.join(', ')}`,
        patch: Object.fromEntries(stray.map((f) => [f, undefined])) as Partial<Recurrence>,
      },
    });
  }

  // 3. Cadence: does `frequency` match the spacing of held editions?
  if (ev.intervals.length >= MIN_INTERVALS_FOR_FREQUENCY && ev.dominantInterval !== null) {
    const derived =
      ev.intervalConsistency < 0.6 ? 'irregular'
      : ev.dominantInterval === 1 ? 'annual'
      : ev.dominantInterval === 2 ? 'biennial'
      : 'irregular';
    if (derived !== r.frequency) {
      findings.push({
        id: 'frequency-mismatch', severity: 'warning', field: 'frequency',
        message: `Declared ${r.frequency}, editions look ${derived}`,
        detail:
          `${ev.heldYears.length} held editions ${ev.heldYears[0]}–${ev.heldYears.at(-1)}, ` +
          `gaps of ${ev.intervals.join(', ')} year(s); ` +
          `${Math.round(ev.intervalConsistency * 100)}% are ${ev.dominantInterval} year(s) apart` +
          (ev.cancelledYears.length ? ` (cancelled ${ev.cancelledYears.join(', ')} discounted)` : ''),
        fix: { label: `Set frequency to ${derived}`, patch: { frequency: derived } },
      });
    }
  }

  // 4. Calendar: a start date sliding ~11 days earlier each year is hijri.
  //    The median alone is not enough — one rescheduled edition drags it a long
  //    way — so the shifts also have to agree with each other before this says
  //    anything.
  if (ev.drifts.length >= MIN_DRIFTS_FOR_CALENDAR) {
    const share = (fn: (d: number) => boolean) =>
      ev.drifts.filter(fn).length / ev.drifts.length;
    const lunarShare = share((d) => d <= -6 && d >= -16);
    const fixedShare = share((d) => Math.abs(d) <= 5);
    const spread = `year-on-year shifts: ${ev.drifts.map((d) => (d > 0 ? `+${d}` : d)).join(', ')} days`;

    if (lunarShare >= DRIFT_AGREEMENT_LUNAR && r.type !== 'hijri') {
      findings.push({
        id: 'drift-hijri', severity: 'warning', field: 'type',
        message: `Start date slides ${ev.medianDrift} days earlier each year — a hijri pattern`,
        detail:
          `${Math.round(lunarShare * 100)}% of ${spread}. A lunar-anchored event moves ~11 days ` +
          `earlier per Gregorian year; declared type is "${r.type}".`,
      });
    } else if (fixedShare >= DRIFT_AGREEMENT_FIXED && r.type === 'hijri') {
      findings.push({
        id: 'drift-gregorian', severity: 'warning', field: 'type',
        message: 'Dates hold still year to year — not a hijri pattern',
        detail:
          `${Math.round(fixedShare * 100)}% of ${spread}. Declared type is hijri, but a lunar ` +
          'anchor would move the event ~11 days earlier each Gregorian year.',
      });
    }
  }

  // 4b. The same question asked over the long run, which noisy years cannot
  //     distort: across many years a lunar event sweeps right around the
  //     calendar, so one that stays put in the same fortnight is not lunar.
  if (r.type === 'hijri') {
    const dated = ev.editions.filter((e) => e.startDayOfYear !== null);
    const spanYears = dated.length
      ? dated[dated.length - 1].year - dated[0].year
      : 0;
    if (dated.length >= MIN_EDITIONS_FOR_SWEEP && spanYears >= MIN_SPAN_FOR_SWEEP) {
      const days = dated.map((e) => e.startDayOfYear!);
      const observed = Math.max(...days) - Math.min(...days);
      const expected = Math.min(365, HIJRI_DRIFT_PER_YEAR * spanYears);
      if (observed < expected * SWEEP_TOLERANCE) {
        findings.push({
          id: 'hijri-no-sweep', severity: 'warning', field: 'type',
          message: `Declared hijri, but ${spanYears} years of editions stay within ${observed} days of each other`,
          detail:
            `A lunar anchor would have moved the start about ${Math.round(expected)} days over that span. ` +
            `Editions run ${monthLabel(dated[0].start!.month!)}–${monthLabel(dated[dated.length - 1].start!.month!)} throughout. ` +
            'Either the type is wrong or the edition dates are.',
        });
      }
    }
  }

  // 5. Months, for gregorian events. Judged on the month each edition *starts*
  //    in; running over into the next month is handled separately below.
  if (r.type === 'gregorian' && r.months?.length && months.length) {
    const declared = new Set(r.months);
    const missing = months.filter((m) => !declared.has(m));
    const unseen = r.months.filter((m) => !ev.touchedMonths.has(m));
    if (missing.length || unseen.length) {
      const parts: string[] = [];
      if (missing.length) {
        parts.push(`starts in ${missing.map((m) => withYears(m, ev.startMonths.get(m))).join(', ')} are not declared`);
      }
      if (unseen.length) {
        parts.push(`declared ${unseen.map(monthLabel).join(', ')} but no edition falls there`);
      }
      findings.push({
        id: 'months-mismatch', severity: 'warning', field: 'months',
        message: 'Declared months do not match where the editions start',
        detail:
          `${parts.join('; ')}. Start months across ${ev.datedEditions} dated edition(s): ` +
          `${[...ev.startMonths.entries()].sort((a, b) => a[0] - b[0]).map(([m, y]) => withYears(m, y)).join(', ')}.`,
        fix: { label: `Set months to ${months.map(monthLabel).join(', ')}`, patch: { months } },
      });
    }
  }

  // 5b. Editions that regularly run into an undeclared month. Not an error —
  //     `months` may legitimately name only the month the event opens in.
  if (r.type === 'gregorian' && r.months?.length) {
    const spill = spilloverMonths(ev).filter((m) => !r.months!.includes(m));
    if (spill.length) {
      const merged = [...new Set([...r.months, ...spill])].sort((a, b) => a - b);
      findings.push({
        id: 'months-spillover', severity: 'info', field: 'months',
        message: `Editions regularly run into ${spill.map(monthLabel).join(', ')}`,
        detail:
          `${spill.map((m) => withYears(m, ev.touchedMonths.get(m))).join('; ')}. ` +
          'Declare it only if you want `months` to cover the whole span rather than the opening month.',
        fix: { label: `Set months to ${merged.map(monthLabel).join(', ')}`, patch: { months: merged } },
      });
    }
  }

  // 6. Part of the month.
  const part = suggestedPart(ev.startDays);
  if (r.type === 'gregorian' && ev.startDays.length >= 3) {
    const range = `days ${Math.min(...ev.startDays)}–${Math.max(...ev.startDays)} across ${ev.startDays.length} edition(s)`;
    if (!r.part && part) {
      findings.push({
        id: 'part-missing', severity: 'info', field: 'part',
        message: 'No part of month declared, though the editions agree on one',
        detail: `Start dates fall on ${range}.`,
        fix: { label: `Set part to ${part}`, patch: { part } },
      });
    } else if (r.part) {
      const [lo, hi] = PART_RANGES[r.part];
      const covered = ev.startDays.filter((d) => d >= lo && d <= hi).length;
      if (covered / ev.startDays.length < 0.6 && part) {
        findings.push({
          id: 'part-mismatch', severity: 'warning', field: 'part',
          message: `Declared part "${r.part}" fits only ${covered} of ${ev.startDays.length} editions`,
          detail: `"${r.part}" covers days ${lo}–${hi}, but starts fall on ${range}.`,
          fix: { label: `Set part to ${part}`, patch: { part } },
        });
      }
    }
  }

  // 7. Typical duration.
  if (ev.medianDuration !== null) {
    const derived = Math.round(ev.medianDuration);
    if (r.typicalDurationDays === undefined) {
      findings.push({
        id: 'duration-missing', severity: 'info', field: 'typicalDurationDays',
        message: 'No typical duration declared',
        detail: `${ev.durations.length} edition(s) have both dates; median length is ${derived} day(s) (range ${Math.min(...ev.durations)}–${Math.max(...ev.durations)}).`,
        fix: { label: `Set typicalDurationDays to ${derived}`, patch: { typicalDurationDays: derived } },
      });
    } else if (Math.abs(r.typicalDurationDays - derived) > 1) {
      findings.push({
        id: 'duration-mismatch', severity: 'warning', field: 'typicalDurationDays',
        message: `Declared ${r.typicalDurationDays} days, editions median ${derived}`,
        detail: `Across ${ev.durations.length} edition(s) with both dates: ${ev.durations.join(', ')} day(s).`,
        fix: { label: `Set typicalDurationDays to ${derived}`, patch: { typicalDurationDays: derived } },
      });
    }
  }

  // 8. The note is prose, so only contradictions worth a human look are flagged.
  if (r.note && ev.datedEditions) {
    const mentioned = MONTH_MENTION
      .map((re, i) => ({ month: i + 1, matched: re.test(r.note!) }))
      .filter(({ matched }) => matched)
      .map(({ month }) => month);
    const contradicted = mentioned.filter((m) => !ev.touchedMonths.has(m));
    if (contradicted.length) {
      // A note that names several months is usually describing how the dates
      // have moved around. Only a note whose months are *all* unsupported is
      // likely to be plain wrong.
      const corroborated = mentioned.length > contradicted.length;
      findings.push({
        id: 'note-contradicts-months',
        severity: corroborated ? 'info' : 'warning',
        field: 'note',
        message: `Note mentions ${contradicted.map(monthLabel).join(', ')}, which no edition falls in`,
        detail:
          `Editions fall in ${[...ev.touchedMonths.keys()].sort((a, b) => a - b).map(monthLabel).join(', ')}.` +
          (corroborated
            ? ' The note names other months that do match, so it is probably describing dates that vary.'
            : ''),
      });
    }
  }

  // 9. Broken edition dates, which make every check above less trustworthy.
  const broken = ev.editions.filter((e) => e.problems.length);
  if (broken.length) {
    findings.push({
      id: 'edition-date-problems', severity: 'error', field: 'editions',
      message: `${broken.length} edition(s) have unusable dates`,
      detail: broken.map((e) => `${e.year}: ${e.problems.join('; ')}`).join(' · '),
    });
  }

  if (ev.duplicateYears.length) {
    findings.push({
      id: 'duplicate-edition-years', severity: 'error', field: 'editions',
      message: `More than one edition entry for ${ev.duplicateYears.join(', ')}`,
      detail: 'Duplicate years distort every cadence and drift check below. Merge or correct them.',
    });
  }

  // 10. Gaps worth backfilling — not a recurrence error, but it weakens the evidence.
  if (ev.unexplainedGaps.length && ev.dominantInterval !== null) {
    findings.push({
      id: 'edition-gaps', severity: 'info', field: 'editions',
      message: `${ev.unexplainedGaps.length} gap(s) in the edition history`,
      detail:
        `Missing years between ${ev.unexplainedGaps.map((g) => `${g.from}→${g.to}`).join(', ')}. ` +
        'Either editions are missing from the dataset, or those years were skipped and should be marked cancelled.',
    });
  }

  if (!ev.datedEditions) {
    findings.push({
      id: 'no-dated-editions', severity: 'info', field: 'editions',
      message: 'No edition has a start date',
      detail: 'Nothing here can be checked against evidence until editions carry dates.',
    });
  }

  return { evidence: ev, findings };
}

export const worstSeverity = (findings: Finding[]): Severity | null =>
  findings.some((f) => f.severity === 'error') ? 'error'
  : findings.some((f) => f.severity === 'warning') ? 'warning'
  : findings.length ? 'info'
  : null;
