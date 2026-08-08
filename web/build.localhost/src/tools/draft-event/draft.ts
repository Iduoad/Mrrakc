/**
 * An event *source draft*: what a human knows about an event that is not in
 * `data/events/` yet.
 *
 * A draft is not a dataset record and does not try to be one. It is the brief a
 * research agent is later pointed at — the agent fills the gaps from the web
 * and writes the real `data/events/<id>.json` (through Event Editor, or by
 * hand). So the bulk of it is prose: typing structure you have not verified
 * costs time and invents precision, and the agent has to re-check it anyway.
 *
 * Only the identity is structured, because that is the part you actually know
 * when you start, and the id has to be a filename.
 *
 * Drafts live in `sources/new-events/<id>.json`, outside `data/` and outside
 * git — see server/fs-api.ts.
 */

export const DRAFT_VERSION = 'mrrakc/event-source-v0';

/**
 * How far a draft has got through the pipeline. Named `stage` rather than
 * `status` because `status` already means the event's own active/discontinued.
 *
 * - `draft` — captured here, no agent has worked it yet.
 * - `added` — an agent researched it and wrote `data/events/<id>.json`.
 * - `done`  — that entry has since been read and accepted by a human.
 *
 * Only a human sets `done`: "an agent says it is finished" and "I have checked
 * it" are not the same claim.
 */
export const STAGES = ['draft', 'added', 'done'] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  draft: 'Draft',
  added: 'Added',
  done: 'Done',
};

export const STAGE_HINT: Record<Stage, string> = {
  draft: 'Not picked up yet — waiting for a research pass.',
  added: 'An agent has written the dataset entry; not reviewed yet.',
  done: 'Added and reviewed by you.',
};

/** Tolerate a hand-edited or older file that has no stage. */
export const stageOf = (d: { stage?: string }): Stage =>
  STAGES.includes(d.stage as Stage) ? (d.stage as Stage) : 'draft';

export interface EventDraft {
  version: typeof DRAFT_VERSION;
  /** Kebab-case; the filename stem, and the intended `spec.id`. */
  id: string;
  name: string;
  stage?: Stage;
  /** From schema/enums/event-kinds.json, when known. */
  kind?: string;
  status?: string;
  /** `province/<slug>` refs — the intended `spec.host.provinces`. */
  provinces?: string[];
  description?: string;
  /** Prose: when it happens, how sure you are, what anchors it. */
  recurrence?: string;
  /** Prose: one link per line, with whatever you know about each. */
  links?: string;
  /** Prose: the editions you know of, one per line. */
  editions?: string;
  /** Prose: what to research, what is uncertain, where to look. */
  research?: string;
  createdAt: string;
  updatedAt: string;
}

/** The placeholder text is the spec for each prose block. */
export const PLACEHOLDERS = {
  recurrence: `When does it happen, and how sure are you?

e.g. Every year in late July, usually the last two weeks. Gregorian —
the dates move a little but never leave July. Ran biennially before 2015.
Or for a lunar one: tied to Mawlid, so it slides ~11 days earlier each year.`,

  links: `One link per line, with what it is.

- https://example.ma — official site
- https://press.example/2024 — 2024 announcement, has the dates
- https://instagram.com/... — the organisers post the programme here first`,

  editions: `The editions you know of, one per line. Partial is fine.

- 2024, 11th edition, 11–13 October
- 2023, October (exact dates unknown)
- 2020 — cancelled, COVID
- ran since about 2012, ordinals before 2018 unclear`,

  research: `What to look for, what is uncertain, what to distrust.

e.g. Ordinals conflict between the official site and the press — confirm
before writing. Editions before 2010 are probably only in the local press.
Do not trust the Wikipedia list, it merges two different festivals.`,
} as const;

export const slugify = (raw: string) =>
  raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const isValidId = (id: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);

/**
 * Fold a draft written by the earlier, fully-structured version of this tool
 * into the prose shape.
 *
 * Those drafts stored `recurrence`, `links` and `editions` as objects and
 * arrays. Rendering one into a textarea would show `[object Object]`, so it is
 * flattened into the text a human would have typed — losing nothing, since the
 * prose is what the research pass reads anyway.
 */
export function migrateDraft(raw: EventDraft): EventDraft {
  const d = raw as EventDraft & Record<string, unknown>;
  const out: EventDraft = { ...raw };
  const lines = (xs: (string | undefined)[]) => xs.filter(Boolean).join('\n');

  if (d.recurrence && typeof d.recurrence === 'object') {
    const r = d.recurrence as Record<string, unknown>;
    const months = Array.isArray(r.months)
      ? `months ${(r.months as number[]).join(', ')}`
      : undefined;
    out.recurrence = lines([
      [r.frequency, r.type].filter(Boolean).join(', ') || undefined,
      months,
      r.part ? `part of month: ${r.part}` : undefined,
      r.hijriMonth ? `hijri month ${r.hijriMonth}${r.hijriDay ? `, day ${r.hijriDay}` : ''}` : undefined,
      r.observance ? `observance: ${r.observance}` : undefined,
      r.season ? `season: ${r.season}` : undefined,
      r.typicalDurationDays ? `typically ${r.typicalDurationDays} days` : undefined,
      r.note as string | undefined,
    ]);
  }

  if (Array.isArray(d.links)) {
    out.links = lines((d.links as Record<string, string>[]).map(
      (l) => `- ${l.url}${l.title ? ` — ${l.title}` : ''}${l.type ? ` (${l.type})` : ''}`,
    ));
  }

  if (Array.isArray(d.editions) || typeof d.editionCount === 'number') {
    const rows = (Array.isArray(d.editions) ? d.editions : []).map((e) => {
      const x = e as Record<string, unknown>;
      const dates = [x.startDate, x.endDate].filter(Boolean).join(' → ');
      return `- ${[
        x.year,
        x.edition ? `edition ${x.edition}` : undefined,
        dates || undefined,
        x.status === 'cancelled' ? 'cancelled' : undefined,
        x.notes as string | undefined,
      ].filter(Boolean).join(', ')}`;
    });
    out.editions = lines([
      ...rows,
      typeof d.editionCount === 'number' ? `\nTotal editions believed to exist: ${d.editionCount}` : undefined,
    ]);
  }

  delete (out as unknown as Record<string, unknown>).editionCount;
  return out;
}

export function newDraft(name = ''): EventDraft {
  const now = new Date().toISOString();
  return {
    version: DRAFT_VERSION,
    id: slugify(name),
    name,
    stage: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Drop blanks so a draft on disk shows only what was actually filled in. An
 * agent reading it should be able to treat "absent" as "unknown" without
 * second-guessing empty placeholders.
 */
export function cleanDraft(draft: EventDraft): EventDraft {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries({
    ...draft,
    stage: stageOf(draft),
    updatedAt: new Date().toISOString(),
  })) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    if (Array.isArray(value) && !value.length) continue;
    out[key] = typeof value === 'string' ? value.trim() : value;
  }
  return out as unknown as EventDraft;
}
