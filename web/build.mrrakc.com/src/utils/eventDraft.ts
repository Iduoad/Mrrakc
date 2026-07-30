import type { Event } from '../data/schema';

// ---------------------------------------------------------------------------
// Draft model — a UI-friendly mirror of an Event. Numeric fields are held as
// strings (raw <input> values) and coerced on save; every array is always
// present so the form can map over it. draftToEvent() drops empties and gates
// recurrence fields by the selected type so the output validates against the
// strict JSON Schema (schema/events.json).
// ---------------------------------------------------------------------------

export interface LinkDraft {
  url: string;
  title: string;
  type: string;
}

export interface EditionDraft {
  edition: string;
  year: string;
  status: string; // '' | 'held' | 'cancelled'
  startDate: string;
  endDate: string;
  provinces: string[];
  places: string[];
  links: LinkDraft[];
  notes: string;
}

export interface AdmissionOptionDraft {
  title: string;
  modality: string;
  audience: string;
  entranceFee: string;
}

export interface RecurrenceDraft {
  frequency: string;
  type: string;
  typicalDurationDays: string;
  note: string;
  months: number[];
  part: string;
  hijriMonth: string;
  hijriDay: string;
  observance: string;
  season: string;
  urls: { url: string; title: string }[];
}

export interface EventDraft {
  kind: string;
  tags: string[];
  spec: {
    name: string;
    id: string;
    description: string;
    status: string;
    provinces: string[];
    places: string[];
    recurrence: RecurrenceDraft;
    admission: AdmissionOptionDraft[];
    editions: EditionDraft[];
    links: LinkDraft[];
    comments: string[];
  };
}

export function newLink(): LinkDraft {
  return { url: '', title: '', type: 'website' };
}

export function newEdition(): EditionDraft {
  return {
    edition: '', year: '', status: '', startDate: '', endDate: '',
    provinces: [], places: [], links: [], notes: '',
  };
}

export function newAdmissionOption(): AdmissionOptionDraft {
  return { title: '', modality: 'free', audience: 'all', entranceFee: '-1' };
}

export function makeEmptyEventDraft(): EventDraft {
  return {
    kind: 'festival/music',
    tags: [],
    spec: {
      name: '',
      id: '',
      description: '',
      status: 'active',
      provinces: [],
      places: [],
      recurrence: {
        frequency: 'annual',
        type: 'gregorian',
        typicalDurationDays: '',
        note: '',
        months: [],
        part: '',
        hijriMonth: '',
        hijriDay: '',
        observance: '',
        season: '',
        urls: [],
      },
      admission: [],
      editions: [],
      links: [],
      comments: [],
    },
  };
}

const numStr = (n: number | undefined): string => (n === undefined || n === null ? '' : String(n));

export function eventToDraft(event: Event): EventDraft {
  const s = event.spec;
  const r = s.recurrence ?? ({} as NonNullable<Event['spec']['recurrence']>);
  return {
    kind: event.kind,
    tags: event.metadata?.tags ? [...event.metadata.tags] : [],
    spec: {
      name: s.name || '',
      id: s.id || '',
      description: s.description || '',
      status: s.status || 'active',
      provinces: s.host?.provinces ? [...s.host.provinces] : [],
      places: s.host?.places ? [...s.host.places] : [],
      recurrence: {
        frequency: r.frequency || 'annual',
        type: r.type || 'gregorian',
        typicalDurationDays: numStr(r.typicalDurationDays),
        note: r.note || '',
        months: r.months ? [...r.months] : [],
        part: r.part || '',
        hijriMonth: numStr(r.hijriMonth),
        hijriDay: numStr(r.hijriDay),
        observance: r.observance || '',
        season: r.season || '',
        urls: r.urls ? r.urls.map(u => ({ url: u.url, title: u.title || '' })) : [],
      },
      admission: (s.admission?.options ?? []).map(o => ({
        title: o.title || '',
        modality: o.modality || 'free',
        audience: o.audience || 'all',
        entranceFee: numStr(o.entranceFee),
      })),
      editions: (s.editions ?? []).map(e => ({
        edition: numStr(e.edition),
        year: numStr(e.year),
        status: e.status || '',
        startDate: e.startDate || '',
        endDate: e.endDate || '',
        provinces: e.provinces ? [...e.provinces] : [],
        places: e.places ? [...e.places] : [],
        links: e.links ? e.links.map(l => ({ url: l.url, title: l.title, type: l.type })) : [],
        notes: e.notes || '',
      })),
      links: (s.links ?? []).map(l => ({ url: l.url, title: l.title, type: l.type })),
      comments: s.comments ? [...s.comments] : [],
    },
  };
}

function cleanLinks(links: LinkDraft[]) {
  return links
    .filter(l => l.url.trim())
    .map(l => ({ url: l.url.trim(), title: l.title.trim(), type: l.type }));
}

// Build a validated-shape Event from the draft, dropping empty/optional fields
// and gating recurrence branch fields by the selected type.
export function draftToEvent(draft: EventDraft): Event {
  const s = draft.spec;
  const r = s.recurrence;

  // Recurrence: always frequency + type; shared optionals; branch by type.
  const recurrence: Record<string, unknown> = {
    frequency: r.frequency,
    type: r.type,
  };
  const dur = Number(r.typicalDurationDays);
  if (r.typicalDurationDays.trim() && !Number.isNaN(dur)) recurrence.typicalDurationDays = dur;
  if (r.note.trim()) recurrence.note = r.note.trim();
  const urls = r.urls.filter(u => u.url.trim()).map(u => ({
    url: u.url.trim(),
    ...(u.title.trim() ? { title: u.title.trim() } : {}),
  }));
  if (urls.length) recurrence.urls = urls;

  if (r.type === 'gregorian') {
    if (r.months.length) recurrence.months = [...r.months].sort((a, b) => a - b);
    if (r.part) recurrence.part = r.part;
  } else if (r.type === 'hijri') {
    if (r.hijriMonth.trim()) recurrence.hijriMonth = Number(r.hijriMonth);
    if (r.hijriDay.trim()) recurrence.hijriDay = Number(r.hijriDay);
    if (r.observance) recurrence.observance = r.observance;
  } else if (r.type === 'seasonal') {
    if (r.season) recurrence.season = r.season;
  }
  // irregular carries only `note`, already added above.

  const spec: Record<string, unknown> = {
    name: s.name.trim(),
    id: s.id.trim(),
    description: s.description.trim(),
    status: s.status,
    host: {
      provinces: s.provinces,
      ...(s.places.length ? { places: s.places } : {}),
    },
    recurrence,
  };

  const admission = s.admission
    .filter(o => o.title.trim())
    .map(o => ({
      title: o.title.trim(),
      modality: o.modality,
      audience: o.audience,
      entranceFee: Number(o.entranceFee) || (o.entranceFee.trim() === '0' ? 0 : -1),
    }));
  if (admission.length) spec.admission = { options: admission };

  const editions = s.editions
    .filter(e => e.year.trim())
    .map(e => {
      const out: Record<string, unknown> = { year: Number(e.year) };
      if (e.edition.trim()) out.edition = Number(e.edition);
      // Omit the default 'held' to match the dataset convention.
      if (e.status === 'cancelled') out.status = 'cancelled';
      if (e.startDate.trim()) out.startDate = e.startDate.trim();
      if (e.endDate.trim()) out.endDate = e.endDate.trim();
      if (e.provinces.length) out.provinces = e.provinces;
      if (e.places.length) out.places = e.places;
      const links = cleanLinks(e.links);
      if (links.length) out.links = links;
      if (e.notes.trim()) out.notes = e.notes.trim();
      return out;
    })
    .sort((a, b) => (a.year as number) - (b.year as number));
  if (editions.length) spec.editions = editions;

  const links = cleanLinks(s.links);
  if (links.length) spec.links = links;

  const comments = s.comments.map(c => c.trim()).filter(Boolean);
  if (comments.length) spec.comments = comments;

  return {
    version: 'mrrakc/v0',
    kind: draft.kind,
    ...(draft.tags.length ? { metadata: { tags: draft.tags } } : {}),
    spec,
  } as Event;
}
