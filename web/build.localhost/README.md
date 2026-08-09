# build.localhost

A local workbench for the Mrrakc dataset: a directory of tools that read and
write `data/` in this repository directly.

This is the counterpart to `web/build.mrrakc.com`, which stays a purely static,
publicly deployed contribution form. Everything that needs filesystem access
lives here instead, and this app is never deployed — there is no build step.

## Running it

```sh
cd web/build.localhost
bun install
cp .env.example .env.local   # add a Google Maps key for map-based tools
bun run dev                  # http://localhost:5180
```

Most tools rewrite a JSON file under `data/`, so keep an eye on `git status`
and review the diff before committing. The exception is Draft Event, which writes
to the gitignored `sources/new-events/`.

## Layout

```
server/fs-api.ts        the local filesystem API (/api/*), grouped per data type
src/catalog.ts          the tool directory: data types + the tools acting on them
src/router.ts           hash routing (#/<dataType>/<tool>)
src/pages/              the two directory pages (index, per data type)
src/tools/<tool>/       one directory per tool
src/components/         shared UI (map, forms, fields, links, modal, toasts)
src/data/               schema mirrors + shared domain rules (recurrence)
```

Navigation follows the catalog: the index lists data types, a data type lists
the tools that act on it, and a tool takes over the content area.

## Adding a tool

1. Write the component under `src/tools/<tool-id>/`.
2. Add the routes it needs to `server/fs-api.ts` and a client for them in
   `src/utils/api.ts`.
3. Register it in `TOOLS` in `src/catalog.ts` — the shell picks it up from
   there. Set `fullBleed: true` if it wants the whole viewport (map editors).

## Tools

| Data type | Tool | What it does |
| --- | --- | --- |
| Places | Places Updater | Loads one province from `data/places/<province>`, plots it on the map, edits places in place and creates new ones by clicking the map. |
| Events | Recurrence Review | Checks each event's declared `spec.recurrence` against the dates of its own `spec.editions`, and fixes what disagrees. |
| Events | Event Editor | The complete `data/events/<id>.json` record as a form — every field in the schema, for editing an event or writing a new one. |
| Events | Draft Event | Jots down an event that is *not* in the dataset yet, in prose, under `sources/new-events/`, as a brief for a later research pass. |

The two events authoring tools are deliberately a pair, split by whether the
facts have been checked yet:

```
Draft Event ──▶ (research pass: the `mrrakc-create-event` skill) ──▶ Event Editor
sources/new-events/<id>.json                                  data/events/<id>.json
prose, unverified                                             structured, schema-complete
```

### Event Editor

`data/events/<id>.json` as a form, covering schema/events.json in full: kind,
`metadata.tags`, the identity block, host provinces and place refs, recurrence,
admission options, links, every edition with its own dates/status/provinces/
places/links/notes, and `spec.comments`. Nothing outside the schema is offered,
so anything you can fill in here is something the file can hold.

Required fields are **reported, not enforced** — a banner lists what is still
empty, including the anchor field the recurrence branch requires (`months` for
gregorian, `hijriMonth` for hijri, and so on), and the save goes through
anyway. Losing work on a half-finished record would be the worse failure, and
`boon schema/events.json` remains the authority.

Two rules keep saves from making changes you did not ask for:

- **Key order is inherited from the file being edited**, not normalised. About a
  third of the events store their keys in some non-schema order; editing one
  field of one of those must not reshuffle the rest into a wall of diff.
- **An empty value is only dropped if the file did not already have it.** Eleven
  events carry a bare `"links": []`; that is theirs to keep. Rows you add and
  leave blank — an edition with no year, a link with no URL — are dropped.

Verified against the whole corpus: all 110 events round-trip byte-identically,
so opening an event and saving it unchanged produces no diff at all.

### Draft Event

The only tool here that does **not** write to `data/`. It captures what you
already know about an event with no dataset entry, as the brief a research agent
is later pointed at to fill the gaps and write the real record.

Everything but the identity is a **free-text block**, on purpose. A draft is a
statement of what is known *and how well*, and prose carries that where fields
cannot: "October, exact dates unknown, ordinals disputed between the official
site and the press" is worth more to the next pass than a date picker set to a
guess. The agent does the structuring once, against sources. Each block's
placeholder is its spec — recurrence, links, editions, research brief.

Structured, because you know it up front and the id has to be a filename: name,
id, kind, status, description, provinces.

**Stage** tracks how far a draft has got, and is what the list filters on:

| Stage | Meaning |
| --- | --- |
| `draft` | Captured here, no agent has worked it yet. |
| `added` | An agent researched it and wrote `data/events/<id>.json`. |
| `done` | That entry has since been read and accepted by you. |

Only a human sets `done` — "an agent says it is finished" and "I have checked
it" are different claims, and collapsing them would lose the review step. The
field is `stage`, not `status`, because `status` already means the event's own
active/discontinued. A file without one reads as `draft`.

Stage and dataset are cross-checked: a `draft` whose id already exists in
`data/events/` warns about the collision, and an `added`/`done` draft with *no*
such file warns that the stage is ahead of reality (or that the entry was
written under a different id).

Drafts live one file per event at `sources/new-events/<id>.json`:

```json
{
  "version": "mrrakc/event-source-v0",
  "id": "taghazout-surf-festival",
  "name": "Taghazout Surf Festival",
  "stage": "draft",
  "kind": "sport/race",
  "status": "active",
  "provinces": ["province/agadir-ida-ou-tanane"],
  "description": "Surf competition on the bay.",
  "recurrence": "Every October, 3 days. Moved around a lot before 2018.",
  "links": "- https://example.ma — official site\n- https://press.example/2024 — has the dates",
  "editions": "- 2024, 11th edition, 11–13 October\n- 2020 — cancelled, COVID\n\nTotal editions believed to exist: 12",
  "research": "Ordinals conflict between the official site and the press — confirm before writing.",
  "createdAt": "…", "updatedAt": "…"
}
```

Blank fields are stripped on save, so absent always means unknown and a reader
never has to tell a placeholder from a fact. Drafts written by the earlier,
fully-structured version of this tool are folded into the prose shape when
opened, so nothing is stranded.

`sources/new-events/` is gitignored wholesale — it is a personal to-research
queue, not a citation, and a draft is disposable once the dataset entry exists.

**Prompt** generates the message that hands a batch of drafts to an agent, and
shows it in a modal to copy. It lists the drafts currently in view, ticked by
default only where the stage is `draft`; an already-added one can still be
included, and says so in its own line so the agent enriches the record rather
than rewriting it. The text is editable before copying.

The prompt is deliberately thin — names, draft paths, and which skill to load.
How to research an event lives in the skill, and what is known about each event
lives in its draft; restating either here would only hand the agent a second,
staler copy to disagree with.

The research pass itself is the `mrrakc-create-event` skill
(`.claude/skills/mrrakc-create-event/`): it picks a draft up from here, researches the
editions year by year, writes `data/events/<id>.json`, validates it with `boon`
plus its own house-rule linter, and sets the draft's stage to `added`. The same
skill handles an event with no draft at all, and enriching the editions of one
already in the dataset.

### Recurrence Review

The check is entirely internal: an event's declared recurrence is compared with
the dates already recorded in its editions. Nothing is fetched, and nothing is
inferred from outside the dataset — so a finding means "these two disagree",
not "the declaration is wrong". Edition dates are often the faulty half.

Findings recompute as you edit, so accepting a suggestion visibly clears the
finding that proposed it. Nothing touches disk until Save.

**Marking an event reviewed** moves it out of the Serious and Flagged tabs into
the Reviewed tab. Its findings stay — sign-off means "I have seen these and
they are acceptable", usually because the edition dates are the imperfect half,
not the recurrence. The sign-off records exactly which findings were on screen
at the time, so later *fixing* things keeps the event reviewed, while a new
finding makes the mark stale and pushes the event back to the top of the
working list.

Those marks are reviewer bookkeeping rather than dataset content, so they live
in `.tmp/review-state.json` — already gitignored, never in `git status`, and
not carried over by a fresh clone.

What it looks at (`src/tools/recurrence-review/analyze.ts`):

- **Schema branch** — `months` for gregorian, `hijriMonth` for hijri, `season`
  for seasonal, `note` for irregular; plus fields left behind from another
  branch. `recurrence` is a `oneOf` over these branches, so changing the
  calendar type in the form rebuilds the record around the new branch and drops
  the old one's fields rather than just hiding them — switching hijri →
  gregorian leaves no stray `hijriMonth`. Shared fields (`frequency`,
  `typicalDurationDays`, `note`, `urls`) carry over. Records that arrived with
  strays from elsewhere get a warning with a one-click cleanup.
- **Frequency** — the spacing of held editions, with cancelled years discounted
  so a COVID gap does not make an annual festival look biennial.
- **Calendar** — a start date sliding ~11 days earlier each year is lunar. Two
  independent tests: agreement among year-on-year shifts, and whether a
  declared-hijri event actually sweeps the calendar over a long span. Both are
  needed; the median shift alone is fooled by a single rescheduled edition.
- **Months** — judged on the month each edition *starts* in. Running over into
  the next month is reported separately, as an optional widening of `months`.
- **Part of month** — the narrowest `part` value covering every observed start
  day.
- **Typical duration** — median edition length against `typicalDurationDays`.
- **Note** — month names in the prose that no edition falls in. Downgraded to
  info when the note names other months that do match, since those notes are
  usually describing dates that vary.
- **Edition hygiene** — unparseable or reversed dates, duplicate years, and
  gaps that suggest missing editions (see the `mrrakc-create-event` skill).

The thresholds are named constants at the top of the findings section; they
were tuned against the current 110 events to keep warnings worth reading.
