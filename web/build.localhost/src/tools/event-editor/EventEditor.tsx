import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, FilePlus2, Link2, RotateCcw, Save, Search, Ticket,
} from 'lucide-react';
import Loading from '../../components/Loading';
import LinkList from '../../components/LinkList';
import ProvincePicker from '../../components/ProvincePicker';
import RecurrenceForm from '../../components/RecurrenceForm';
import StringList from '../../components/StringList';
import { SelectInput, TextArea, TextInput } from '../../components/fields';
import { ToastContainer, type NotificationType } from '../../components/Notification';
import { fetchEvents, saveEvent } from '../../utils/api';
import { EVENT_KINDS, EVENT_STATUS, type Event } from '../../data/schema';
import AdmissionForm from './AdmissionForm';
import EditionList from './EditionList';
import {
  cleanEvent, isValidId, missingRequired, newEvent, PLACE_REF, slugify,
} from './event';

/**
 * Event Editor — the full `data/events/<id>.json` record as a form.
 *
 * It covers schema/events.json completely: every field the schema defines is
 * editable here and nothing that is not. Saving writes the dataset file, so the
 * output is the record itself — for capturing an event you have not researched
 * yet, use Draft Event instead.
 *
 * Required fields are reported rather than enforced. The JSON Schema plus
 * `boon` stays the authority; blocking a save here would only mean losing work
 * on a record that is halfway done.
 */
export default function EventEditor() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isReady, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Event | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  const [notifications, setNotifications] = useState<
    { id: string; message: string; type: NotificationType }[]
  >([]);
  const notify = useCallback((message: string, type: NotificationType = 'info') => {
    setNotifications((prev) => [...prev, { id: Math.random().toString(36).slice(2, 9), message, type }]);
  }, []);
  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    fetchEvents()
      .then(({ events: loaded, errors }) => {
        setEvents(loaded.map((l) => l.event));
        if (errors.length) {
          notify(`${errors.length} event file(s) failed to parse (see console).`, 'error');
          console.warn('Unparseable event files:', errors);
        }
      })
      .catch((e) => notify(`Failed to load events: ${e.message}`, 'error'))
      .finally(() => setReady(true));
  }, [notify]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((e) => !q || e.spec.name.toLowerCase().includes(q) || e.spec.id.includes(q))
      .sort((a, b) => a.spec.name.localeCompare(b.spec.name));
  }, [events, query]);

  // The record as stored, for the dirty check and Revert.
  const stored = useMemo(
    () => events.find((e) => e.spec.id === selectedId) ?? null,
    [events, selectedId],
  );
  const isNew = !!draft && !stored;
  const isDirty = !!draft && (isNew || JSON.stringify(draft) !== JSON.stringify(stored));

  const set = (patch: Partial<Event>) => draft && setDraft({ ...draft, ...patch });
  const setSpec = (patch: Partial<Event['spec']>) =>
    draft && setDraft({ ...draft, spec: { ...draft.spec, ...patch } });

  const create = () => {
    setSelectedId(null);
    setDraft(newEvent());
  };

  const open = (e: Event) => {
    setSelectedId(e.spec.id);
    setDraft(structuredClone(e));
  };

  const idError = useMemo(() => {
    if (!draft) return null;
    const id = draft.spec.id.trim();
    if (!id) return 'An id is required — it becomes the filename.';
    if (!isValidId(id)) return 'Must be kebab-case: lowercase letters, digits and single hyphens.';
    if (id !== selectedId && events.some((e) => e.spec.id === id)) {
      return `data/events/${id}.json already exists.`;
    }
    return null;
  }, [draft, events, selectedId]);

  const gaps = useMemo(() => (draft ? missingRequired(draft) : []), [draft]);

  const save = async () => {
    if (!draft || idError) return;
    const next = cleanEvent(draft, stored ?? undefined);
    setSaving(true);
    try {
      await saveEvent(next);
      setEvents((prev) => {
        const without = prev.filter((e) => e.spec.id !== next.spec.id && e.spec.id !== selectedId);
        return [...without, next];
      });
      setSelectedId(next.spec.id);
      setDraft(structuredClone(next));
      notify(`Saved data/events/${next.spec.id}.json`, 'success');
    } catch (e) {
      notify(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isReady) return <Loading label="Loading events…" />;

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Event list */}
      <aside className="flex w-[300px] shrink-0 flex-col border-r border-clay bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="space-y-3 border-b border-clay p-4 dark:border-stone-800">
          <button
            onClick={create}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-terra px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-terra-dark"
          >
            <FilePlus2 size={14} /> New event
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${events.length} events…`}
              className="w-full rounded-xl border border-clay bg-sand/50 py-2 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-terra dark:border-stone-700 dark:bg-stone-800"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {visible.length === 0 && (
            <p className="py-16 text-center text-sm italic text-stone-400">No events match.</p>
          )}
          {visible.map((e) => (
            <button
              key={e.spec.id}
              onClick={() => open(e)}
              className={`mb-1 block w-full rounded-xl border p-3 text-left transition-all ${
                e.spec.id === selectedId
                  ? 'border-terra bg-terra/5 ring-1 ring-terra/20'
                  : 'border-transparent hover:border-clay hover:bg-clay/5 dark:hover:border-stone-800'
              }`}
            >
              <p className="truncate text-sm font-bold leading-tight">{e.spec.name}</p>
              <p className="truncate text-[10px] text-stone-400">
                {e.kind} · {e.spec.editions?.length ?? 0} editions
              </p>
            </button>
          ))}
        </div>
      </aside>

      {/* Editor */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        {!draft ? (
          <div className="flex h-full items-center justify-center px-8 text-center">
            <div className="max-w-sm space-y-2">
              <p className="font-serif text-lg font-bold text-terra">Event Editor</p>
              <p className="text-sm leading-relaxed text-charcoal-light dark:text-stone-400">
                The complete <code className="font-mono text-xs">data/events/*.json</code> record —
                every field in the schema, nothing else. Pick one of the {events.length} events, or
                start a new one.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 p-6">
            <header className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-serif text-2xl font-black text-terra">
                  {draft.spec.name || 'Untitled event'}
                </h1>
                <p className="mt-1 font-mono text-xs text-stone-400">
                  data/events/{draft.spec.id || '…'}.json
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => (stored ? setDraft(structuredClone(stored)) : setDraft(null))}
                  disabled={!isDirty}
                  className="flex items-center gap-1.5 rounded-xl border border-clay px-3 py-2 text-xs font-bold transition-colors hover:bg-clay/20 disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800"
                >
                  <RotateCcw size={14} /> {stored ? 'Revert' : 'Discard'}
                </button>
                <button
                  onClick={save}
                  disabled={!isDirty || !!idError || isSaving}
                  className="flex items-center gap-1.5 rounded-xl bg-terra px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-terra-dark disabled:opacity-40"
                >
                  <Save size={14} /> {isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </header>

            {gaps.length > 0 && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-400">
                  Required by the schema but still empty:{' '}
                  <span className="font-mono">{gaps.join(', ')}</span>. You can save anyway —{' '}
                  <span className="font-mono">boon schema/events.json</span> is the authority.
                </p>
              </div>
            )}

            {/* Identity */}
            <section className="space-y-4 rounded-2xl border border-clay bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <h2 className="font-serif font-bold">Identity</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput
                  label="Name"
                  value={draft.spec.name}
                  placeholder="Festival of…"
                  onChange={(name) => setSpec({
                    name,
                    // The id follows the name only while the record is new;
                    // afterwards it is the filename and changes deliberately.
                    id: stored ? draft.spec.id : slugify(name),
                  })}
                />
                <TextInput
                  label="Id"
                  mono
                  value={draft.spec.id}
                  placeholder="festival-of-something"
                  hint={idError && <span className="text-red-600">{idError}</span>}
                  onChange={(id) => setSpec({ id })}
                />
                <SelectInput
                  label="Kind"
                  value={draft.kind}
                  options={EVENT_KINDS}
                  onChange={(kind) => kind && set({ kind })}
                />
                <SelectInput
                  label="Status"
                  value={draft.spec.status}
                  options={EVENT_STATUS}
                  onChange={(status) => status && setSpec({ status })}
                />
              </div>
              <TextArea
                label="Description"
                rows={4}
                value={draft.spec.description}
                placeholder="What the event is, in a couple of sentences."
                onChange={(description) => setSpec({ description })}
              />
              <StringList
                label="Tags"
                chips
                value={draft.metadata?.tags ?? []}
                placeholder="Type a tag and press Enter"
                hint="metadata.tags — free-form keywords."
                onChange={(tags) => set({ metadata: { ...draft.metadata, tags } })}
              />
            </section>

            {/* Host */}
            <section className="space-y-4 rounded-2xl border border-clay bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <h2 className="font-serif font-bold">Host</h2>
              <ProvincePicker
                value={draft.spec.host.provinces ?? []}
                onChange={(provinces) => setSpec({ host: { ...draft.spec.host, provinces } })}
              />
              <StringList
                label="Venue places"
                value={draft.spec.host.places ?? []}
                placeholder="places/<province>/<id>"
                pattern={PLACE_REF}
                hint="Refs into data/places, when the venues exist there."
                onChange={(places) => setSpec({
                  host: { ...draft.spec.host, places: places.length ? places : undefined },
                })}
              />
            </section>

            {/* Recurrence */}
            <section className="space-y-4 rounded-2xl border border-clay bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <h2 className="font-serif font-bold">Recurrence</h2>
              <RecurrenceForm
                value={draft.spec.recurrence}
                onChange={(recurrence) => setSpec({ recurrence })}
              />
            </section>

            {/* Admission */}
            <section className="space-y-4 rounded-2xl border border-clay bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <div className="flex items-center gap-2">
                <Ticket size={16} className="text-terra" />
                <h2 className="font-serif font-bold">Admission</h2>
              </div>
              <AdmissionForm
                value={draft.spec.admission?.options ?? []}
                onChange={(options) => setSpec({
                  admission: options.length ? { options } : undefined,
                })}
              />
            </section>

            {/* Links */}
            <section className="space-y-4 rounded-2xl border border-clay bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <div className="flex items-center gap-2">
                <Link2 size={16} className="text-terra" />
                <h2 className="font-serif font-bold">Links</h2>
              </div>
              <LinkList
                label="About the event as a whole"
                value={draft.spec.links ?? []}
                onChange={(links) => setSpec({ links })}
              />
            </section>

            {/* Editions */}
            <section className="space-y-4 rounded-2xl border border-clay bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <div>
                <h2 className="font-serif font-bold">
                  Editions{' '}
                  <span className="text-sm font-normal text-stone-400">
                    {draft.spec.editions?.length ?? 0}
                  </span>
                </h2>
                <p className="mt-1 text-xs text-charcoal-light dark:text-stone-400">
                  Sorted by year on save. Only the year is required.
                </p>
              </div>
              <EditionList
                value={draft.spec.editions ?? []}
                onChange={(editions) => setSpec({ editions })}
              />
            </section>

            {/* Comments */}
            <section className="space-y-4 rounded-2xl border border-clay bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <h2 className="font-serif font-bold">Comments</h2>
              <StringList
                label="spec.comments"
                multiline
                value={draft.spec.comments ?? []}
                placeholder="A free remark about the event."
                onChange={(comments) => setSpec({ comments })}
              />
            </section>
          </div>
        )}
      </main>

      <ToastContainer notifications={notifications} removeNotification={dismiss} />
    </div>
  );
}
