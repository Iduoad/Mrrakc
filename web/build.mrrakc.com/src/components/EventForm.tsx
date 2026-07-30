import React, { useMemo } from 'react';
import {
  EventSchema,
  EVENT_KINDS,
  EVENT_STATUS,
  RECURRENCE_FREQUENCIES,
  RECURRENCE_TYPES,
  RECURRENCE_PARTS,
  OBSERVANCES,
  SEASONS,
  EVENT_ADMISSION_MODALITY,
  AUDIENCE,
  LINK_TYPES,
  EDITION_STATUS,
  type Event,
} from '../data/schema';
import type { PlaceRef, ProvinceRef } from '../utils/editorApi';
import {
  type EventDraft,
  type LinkDraft,
  type EditionDraft,
  newLink,
  newEdition,
  newAdmissionOption,
  draftToEvent,
} from '../utils/eventDraft';
import { FuzzyPicker } from './FuzzyPicker';
import {
  Plus, Trash2, MapPin, Info, CalendarClock, Ticket, Link2, Tag,
  MessageSquare, ChevronDown, ChevronRight, X, History, Building2,
} from 'lucide-react';

const selectCls =
  'w-full px-3 py-2 rounded-lg border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-xs outline-none focus:ring-1 focus:ring-terra';
const inputCls = selectCls;
const labelCls = 'text-[10px] uppercase font-bold text-stone-500';
const addBtnCls =
  'text-terra hover:text-terra-dark flex items-center gap-1 text-[10px] font-bold bg-terra/10 px-2 py-1 rounded-md';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// --- Generic ref editor (chips + fuzzy picker) for provinces / places ------

interface RefEditorProps<T> {
  items: T[];
  keyOf: (item: T) => string;
  refOf: (item: T) => string;
  labelForRef: (ref: string) => string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  renderItem?: (item: T) => React.ReactNode;
}

function RefEditor<T>({
  items, keyOf, refOf, labelForRef, values, onChange, placeholder, renderItem,
}: RefEditorProps<T>) {
  const exclude = new Set(values);
  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map(ref => (
            <span
              key={ref}
              className="inline-flex items-center gap-1 bg-sand dark:bg-stone-800 border border-clay dark:border-stone-700 rounded-full pl-2.5 pr-1 py-1 text-[11px]"
              title={ref}
            >
              <span className="truncate max-w-[160px]">{labelForRef(ref)}</span>
              <button
                type="button"
                onClick={() => onChange(values.filter(r => r !== ref))}
                className="text-stone-400 hover:text-red-500"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <FuzzyPicker<T>
        items={items}
        keyOf={keyOf}
        idOf={refOf}
        excludeIds={exclude}
        onSelect={(item) => onChange([...values, refOf(item)])}
        placeholder={placeholder}
        renderItem={renderItem}
      />
    </div>
  );
}

// --- Link list editor (event links + per-edition links) --------------------

const LinkListEditor: React.FC<{ links: LinkDraft[]; onChange: (l: LinkDraft[]) => void }> = ({ links, onChange }) => (
  <div className="space-y-2">
    {links.map((link, i) => (
      <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-1.5 items-center">
        <input
          value={link.url}
          onChange={(e) => onChange(links.map((l, j) => j === i ? { ...l, url: e.target.value } : l))}
          placeholder="https://…"
          className="px-2 py-1.5 rounded-lg border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-[11px] font-mono outline-none focus:ring-1 focus:ring-terra"
        />
        <input
          value={link.title}
          onChange={(e) => onChange(links.map((l, j) => j === i ? { ...l, title: e.target.value } : l))}
          placeholder="Title"
          className="px-2 py-1.5 rounded-lg border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-[11px] outline-none focus:ring-1 focus:ring-terra"
        />
        <select
          value={link.type}
          onChange={(e) => onChange(links.map((l, j) => j === i ? { ...l, type: e.target.value } : l))}
          className="px-2 py-1.5 rounded-lg border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-[11px] outline-none focus:ring-1 focus:ring-terra"
        >
          {LINK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button type="button" onClick={() => onChange(links.filter((_, j) => j !== i))} className="p-1 text-stone-300 hover:text-red-500">
          <X size={14} />
        </button>
      </div>
    ))}
    <button type="button" onClick={() => onChange([...links, newLink()])} className={addBtnCls}>
      <Plus size={11} /> Add link
    </button>
  </div>
);

// --- Simple string list editor (tags / comments) ---------------------------

const StringListEditor: React.FC<{
  items: string[]; onChange: (v: string[]) => void; placeholder: string;
}> = ({ items, onChange, placeholder }) => (
  <div className="space-y-2">
    {items.map((val, i) => (
      <div key={i} className="flex items-center gap-1.5">
        <input
          value={val}
          onChange={(e) => onChange(items.map((v, j) => j === i ? e.target.value : v))}
          placeholder={placeholder}
          className={`${inputCls} text-[11px] py-1.5`}
        />
        <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-1 text-stone-300 hover:text-red-500">
          <X size={14} />
        </button>
      </div>
    ))}
    <button type="button" onClick={() => onChange([...items, ''])} className={addBtnCls}>
      <Plus size={11} /> Add
    </button>
  </div>
);

// --- Edition card ----------------------------------------------------------

interface EditionCardProps {
  edition: EditionDraft;
  onChange: (updater: (e: EditionDraft) => EditionDraft) => void;
  onRemove: () => void;
  provinceEditor: React.ReactNode;
  placeEditor: React.ReactNode;
}

const EditionCard: React.FC<EditionCardProps> = ({ edition, onChange, onRemove, provinceEditor, placeEditor }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-xl border border-clay dark:border-stone-800 bg-white dark:bg-stone-900">
      <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <History size={14} className="text-stone-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate">
            {edition.year ? `${edition.year}` : <span className="text-stone-400 italic font-normal">No year</span>}
            {edition.edition ? ` · edition ${edition.edition}` : ''}
          </p>
          <p className="text-[10px] text-stone-400 truncate">
            {edition.status === 'cancelled' ? 'cancelled' : 'held'}
            {edition.startDate ? ` · ${edition.startDate}${edition.endDate ? `–${edition.endDate}` : ''}` : ''}
            {edition.links.length ? ` · ${edition.links.length} link(s)` : ''}
          </p>
        </div>
        <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1 text-stone-300 hover:text-red-500 shrink-0">
          <Trash2 size={14} />
        </button>
        {open ? <ChevronDown size={14} className="text-stone-400 shrink-0" /> : <ChevronRight size={14} className="text-stone-400 shrink-0" />}
      </div>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-clay/60 dark:border-stone-800 pt-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className={labelCls}>Year *</label>
              <input type="number" value={edition.year} onChange={(e) => onChange(ed => ({ ...ed, year: e.target.value }))} className={inputCls} placeholder="2024" />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Edition #</label>
              <input type="number" min={1} value={edition.edition} onChange={(e) => onChange(ed => ({ ...ed, edition: e.target.value }))} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Status</label>
              <select value={edition.status || 'held'} onChange={(e) => onChange(ed => ({ ...ed, status: e.target.value }))} className={selectCls}>
                {EDITION_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className={labelCls}>Start date</label>
              <input value={edition.startDate} onChange={(e) => onChange(ed => ({ ...ed, startDate: e.target.value }))} className={inputCls} placeholder="YYYY-MM-DD / YYYY-MM / YYYY" />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>End date</label>
              <input value={edition.endDate} onChange={(e) => onChange(ed => ({ ...ed, endDate: e.target.value }))} className={inputCls} placeholder="YYYY-MM-DD / YYYY-MM / YYYY" />
            </div>
          </div>
          <div className="space-y-1">
            <label className={`${labelCls} flex items-center gap-1`}><MapPin size={11} /> Provinces (only if different from host)</label>
            {provinceEditor}
          </div>
          <div className="space-y-1">
            <label className={`${labelCls} flex items-center gap-1`}><Building2 size={11} /> Venues</label>
            {placeEditor}
          </div>
          <div className="space-y-1">
            <label className={`${labelCls} flex items-center gap-1`}><Link2 size={11} /> Links (press, programme, recap)</label>
            <LinkListEditor links={edition.links} onChange={(links) => onChange(ed => ({ ...ed, links }))} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Notes</label>
            <textarea value={edition.notes} onChange={(e) => onChange(ed => ({ ...ed, notes: e.target.value }))} rows={2} className={inputCls} placeholder="e.g. Cancelled due to the COVID-19 pandemic" />
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main form -------------------------------------------------------------

interface Props {
  draft: EventDraft;
  onChange: (draft: EventDraft) => void;
  provinces: ProvinceRef[];
  allPlaces: PlaceRef[];
  onSubmit: (event: Event) => void;
  onCancel: () => void;
  onError: (message: string) => void;
  isEditing: boolean;
}

const EventForm: React.FC<Props> = ({
  draft, onChange, provinces, allPlaces, onSubmit, onCancel, onError, isEditing,
}) => {
  const provincesByRef = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of provinces) m.set(`province/${p.id}`, p.name);
    return m;
  }, [provinces]);
  const placesByRef = useMemo(() => {
    const m = new Map<string, PlaceRef>();
    for (const p of allPlaces) m.set(p.ref, p);
    return m;
  }, [allPlaces]);

  // Auto-derive slug from name while creating.
  React.useEffect(() => {
    if (!isEditing && draft.spec.name && !draft.spec.id) {
      const slug = draft.spec.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      if (slug) onChange({ ...draft, spec: { ...draft.spec, id: slug } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.spec.name]);

  const setSpec = (patch: Partial<EventDraft['spec']>) =>
    onChange({ ...draft, spec: { ...draft.spec, ...patch } });
  const setRecurrence = (patch: Partial<EventDraft['spec']['recurrence']>) =>
    setSpec({ recurrence: { ...draft.spec.recurrence, ...patch } });

  const provinceEditor = (values: string[], onVals: (v: string[]) => void, placeholder: string) => (
    <RefEditor<ProvinceRef>
      items={provinces}
      keyOf={(p) => p.name}
      refOf={(p) => `province/${p.id}`}
      labelForRef={(ref) => provincesByRef.get(ref) ?? ref}
      values={values}
      onChange={onVals}
      placeholder={placeholder}
      renderItem={(p) => <span className="font-medium">{p.name}</span>}
    />
  );
  const placeEditor = (values: string[], onVals: (v: string[]) => void) => (
    <RefEditor<PlaceRef>
      items={allPlaces}
      keyOf={(p) => `${p.spec.name} ${p.spec.location.province.replace('province/', '')}`}
      refOf={(p) => p.ref}
      labelForRef={(ref) => placesByRef.get(ref)?.spec.name ?? ref}
      values={values}
      onChange={onVals}
      placeholder="Search venues to add…"
      renderItem={(p) => (
        <div className="flex flex-col">
          <span className="font-medium">{p.spec.name}</span>
          <span className="text-[10px] text-stone-400">{p.kind} · {p.spec.location.province.replace('province/', '')}</span>
        </div>
      )}
    />
  );

  const r = draft.spec.recurrence;

  const submit = () => {
    const event = draftToEvent(draft);
    const result = EventSchema.safeParse(event);
    if (!result.success) {
      console.error('Event validation failed:', result.error);
      const first = result.error.issues[0];
      onError(first ? `${first.path.join('.') || 'event'}: ${first.message}` : 'Please check the highlighted fields.');
      return;
    }
    onSubmit(result.data);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-stone-900 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {/* Basics */}
        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-charcoal-light dark:text-stone-400 flex items-center gap-2">
            <Info size={14} /> Event details
          </h4>
          <div className="space-y-1">
            <label className={labelCls}>Name</label>
            <input value={draft.spec.name} onChange={(e) => setSpec({ name: e.target.value })} className={inputCls} placeholder="e.g. Gnaoua World Music Festival" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className={labelCls}>ID (slug)</label>
              <input value={draft.spec.id} onChange={(e) => setSpec({ id: e.target.value })} className={`${inputCls} font-mono`} placeholder="gnaoua-world-music-festival" />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Status</label>
              <select value={draft.spec.status} onChange={(e) => setSpec({ status: e.target.value })} className={selectCls}>
                {EVENT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Kind</label>
            <select value={draft.kind} onChange={(e) => onChange({ ...draft, kind: e.target.value })} className={`${selectCls} font-mono`}>
              {EVENT_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Description</label>
            <textarea value={draft.spec.description} onChange={(e) => setSpec({ description: e.target.value })} rows={4} className={inputCls} placeholder="What is this event about…" />
          </div>
        </section>

        {/* Host */}
        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-charcoal-light dark:text-stone-400 flex items-center gap-2">
            <MapPin size={14} /> Host
          </h4>
          <div className="space-y-1">
            <label className={labelCls}>Provinces * (first = primary host)</label>
            {provinceEditor(draft.spec.provinces, (v) => setSpec({ provinces: v }), 'Search provinces to add…')}
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Venues (optional)</label>
            {placeEditor(draft.spec.places, (v) => setSpec({ places: v }))}
          </div>
        </section>

        {/* Recurrence */}
        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-charcoal-light dark:text-stone-400 flex items-center gap-2">
            <CalendarClock size={14} /> Recurrence
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className={labelCls}>Frequency</label>
              <select value={r.frequency} onChange={(e) => setRecurrence({ frequency: e.target.value })} className={selectCls}>
                {RECURRENCE_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Type</label>
              <select value={r.type} onChange={(e) => setRecurrence({ type: e.target.value })} className={selectCls}>
                {RECURRENCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {r.type === 'gregorian' && (
            <div className="space-y-2">
              <label className={labelCls}>Months</label>
              <div className="grid grid-cols-6 gap-1">
                {MONTHS.map((m, i) => {
                  const month = i + 1;
                  const on = r.months.includes(month);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRecurrence({ months: on ? r.months.filter(x => x !== month) : [...r.months, month] })}
                      className={`py-1.5 rounded-md text-[11px] font-medium border transition-colors ${on ? 'bg-terra text-white border-terra' : 'border-clay dark:border-stone-700 text-stone-500 hover:border-terra'}`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Part of month</label>
                <select value={r.part} onChange={(e) => setRecurrence({ part: e.target.value })} className={selectCls}>
                  <option value="">— none —</option>
                  {RECURRENCE_PARTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          )}

          {r.type === 'hijri' && (
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className={labelCls}>Hijri month (1–12)</label>
                <input type="number" min={1} max={12} value={r.hijriMonth} onChange={(e) => setRecurrence({ hijriMonth: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Hijri day</label>
                <input type="number" min={1} max={30} value={r.hijriDay} onChange={(e) => setRecurrence({ hijriDay: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Observance</label>
                <select value={r.observance} onChange={(e) => setRecurrence({ observance: e.target.value })} className={selectCls}>
                  <option value="">— none —</option>
                  {OBSERVANCES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          )}

          {r.type === 'seasonal' && (
            <div className="space-y-1">
              <label className={labelCls}>Season</label>
              <select value={r.season} onChange={(e) => setRecurrence({ season: e.target.value })} className={selectCls}>
                <option value="">— none —</option>
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className={labelCls}>Typical duration (days)</label>
              <input type="number" min={0} value={r.typicalDurationDays} onChange={(e) => setRecurrence({ typicalDurationDays: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Note {r.type === 'irregular' ? '(required for irregular)' : ''}</label>
            <input value={r.note} onChange={(e) => setRecurrence({ note: e.target.value })} className={inputCls} placeholder="e.g. Usually held in May or June" />
          </div>
        </section>

        {/* Admission */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-widest text-charcoal-light dark:text-stone-400 flex items-center gap-2">
              <Ticket size={14} /> Admission ({draft.spec.admission.length})
            </h4>
            <button type="button" onClick={() => setSpec({ admission: [...draft.spec.admission, newAdmissionOption()] })} className={addBtnCls}>
              <Plus size={12} /> Add option
            </button>
          </div>
          {draft.spec.admission.map((opt, i) => (
            <div key={i} className="rounded-lg border border-clay dark:border-stone-800 p-2.5 space-y-2 bg-sand/30 dark:bg-stone-950/20">
              <div className="flex items-center gap-1.5">
                <input value={opt.title} onChange={(e) => setSpec({ admission: draft.spec.admission.map((o, j) => j === i ? { ...o, title: e.target.value } : o) })} placeholder="Label (e.g. Free public stages)" className={`${inputCls} text-[11px] py-1.5`} />
                <button type="button" onClick={() => setSpec({ admission: draft.spec.admission.filter((_, j) => j !== i) })} className="p-1 text-stone-300 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select value={opt.modality} onChange={(e) => setSpec({ admission: draft.spec.admission.map((o, j) => j === i ? { ...o, modality: e.target.value } : o) })} className={`${selectCls} text-[11px]`}>
                  {EVENT_ADMISSION_MODALITY.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={opt.audience} onChange={(e) => setSpec({ admission: draft.spec.admission.map((o, j) => j === i ? { ...o, audience: e.target.value } : o) })} className={`${selectCls} text-[11px]`}>
                  {AUDIENCE.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <input type="number" min={-1} value={opt.entranceFee} onChange={(e) => setSpec({ admission: draft.spec.admission.map((o, j) => j === i ? { ...o, entranceFee: e.target.value } : o) })} placeholder="MAD (-1 = N/A)" className={`${inputCls} text-[11px]`} />
              </div>
            </div>
          ))}
        </section>

        {/* Editions */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-widest text-charcoal-light dark:text-stone-400 flex items-center gap-2">
              <History size={14} /> Editions ({draft.spec.editions.length})
            </h4>
            <button type="button" onClick={() => setSpec({ editions: [...draft.spec.editions, newEdition()] })} className={addBtnCls}>
              <Plus size={12} /> Add edition
            </button>
          </div>
          <p className="text-[10px] text-stone-400 italic">
            Backfill past editions here, or via the AI-assisted pipeline (scripts/backfill).
          </p>
          <div className="space-y-2">
            {draft.spec.editions.map((edition, i) => (
              <EditionCard
                key={i}
                edition={edition}
                onChange={(updater) => setSpec({ editions: draft.spec.editions.map((e, j) => j === i ? updater(e) : e) })}
                onRemove={() => setSpec({ editions: draft.spec.editions.filter((_, j) => j !== i) })}
                provinceEditor={provinceEditor(edition.provinces, (v) => setSpec({ editions: draft.spec.editions.map((e, j) => j === i ? { ...e, provinces: v } : e) }), 'Search provinces…')}
                placeEditor={placeEditor(edition.places, (v) => setSpec({ editions: draft.spec.editions.map((e, j) => j === i ? { ...e, places: v } : e) }))}
              />
            ))}
          </div>
        </section>

        {/* Links */}
        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-charcoal-light dark:text-stone-400 flex items-center gap-2">
            <Link2 size={14} /> Links
          </h4>
          <LinkListEditor links={draft.spec.links} onChange={(links) => setSpec({ links })} />
        </section>

        {/* Tags */}
        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-charcoal-light dark:text-stone-400 flex items-center gap-2">
            <Tag size={14} /> Tags
          </h4>
          <StringListEditor items={draft.tags} onChange={(tags) => onChange({ ...draft, tags })} placeholder="e.g. music, gnawa, essaouira" />
        </section>

        {/* Comments */}
        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-charcoal-light dark:text-stone-400 flex items-center gap-2">
            <MessageSquare size={14} /> Comments
          </h4>
          <StringListEditor items={draft.spec.comments} onChange={(comments) => setSpec({ comments })} placeholder="Free note about the event" />
        </section>
      </div>

      <div className="shrink-0 p-5 border-t border-clay dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 border border-clay dark:border-stone-700 rounded-lg hover:bg-clay/20 transition-colors text-sm font-bold">
          Cancel
        </button>
        <button type="button" onClick={submit} className="flex-[2] px-4 py-3 bg-terra hover:bg-terra-dark text-white font-bold rounded-lg transition-colors shadow-lg shadow-terra/20 text-sm">
          {isEditing ? 'Save Event' : 'Create Event'}
        </button>
      </div>
    </div>
  );
};

export default EventForm;
