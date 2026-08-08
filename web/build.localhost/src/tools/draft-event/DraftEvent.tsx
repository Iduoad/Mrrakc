import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FilePlus2, RotateCcw, Save, Search, Trash2 } from 'lucide-react';
import Loading from '../../components/Loading';
import ProvincePicker from '../../components/ProvincePicker';
import { SelectInput, TextArea, TextInput } from '../../components/fields';
import { ToastContainer, type NotificationType } from '../../components/Notification';
import { deleteEventDraft, fetchEventDrafts, fetchEvents, saveEventDraft } from '../../utils/api';
import { EVENT_KINDS, EVENT_STATUS } from '../../data/schema';
import {
  cleanDraft, isValidId, migrateDraft, newDraft, PLACEHOLDERS, slugify, stageOf,
  STAGE_HINT, STAGE_LABEL, STAGES, type EventDraft, type Stage,
} from './draft';

/** Stage colours: the same chip in the list and in the header picker. */
const STAGE_STYLE: Record<Stage, string> = {
  draft: 'bg-clay/60 text-charcoal-light dark:bg-stone-800 dark:text-stone-400',
  added: 'bg-ocean/15 text-ocean',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
};

const STAGE_ACTIVE: Record<Stage, string> = {
  draft: 'bg-charcoal-light text-white dark:bg-stone-600',
  added: 'bg-ocean text-white',
  done: 'bg-emerald-600 text-white',
};

type Filter = Stage | 'all';

/**
 * Draft Event — capture an event that is not in the dataset yet.
 *
 * Everything but the identity is a free-text block, on purpose. A draft is a
 * brief for a research pass, and prose is faster to write and more honest than
 * fields: "October, exact dates unknown, ordinals disputed" says something a
 * date picker cannot. The agent reading it does the structuring, once, against
 * sources — and writes the record through Event Editor.
 */
export default function DraftEvent() {
  const [drafts, setDrafts] = useState<EventDraft[]>([]);
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
  const [isReady, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

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
    // The event list is only read to check a draft's stage against reality.
    Promise.all([fetchEventDrafts<EventDraft>(), fetchEvents()])
      .then(([{ drafts: loaded, errors }, { events }]) => {
        setDrafts(loaded.map((l) => migrateDraft(l.draft)));
        setExistingIds(new Set(events.map((e) => e.event.spec.id)));
        if (errors.length) {
          notify(`${errors.length} draft file(s) failed to parse (see console).`, 'error');
          console.warn('Unparseable drafts:', errors);
        }
      })
      .catch((e) => notify(`Failed to load drafts: ${e.message}`, 'error'))
      .finally(() => setReady(true));
  }, [notify]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drafts
      .filter((d) => filter === 'all' || stageOf(d) === filter)
      .filter((d) => !q || d.name.toLowerCase().includes(q) || d.id.includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [drafts, query, filter]);

  const counts = useMemo(() => {
    const tally: Record<Stage, number> = { draft: 0, added: 0, done: 0 };
    for (const d of drafts) tally[stageOf(d)]++;
    return tally;
  }, [drafts]);

  const stored = useMemo(
    () => drafts.find((d) => d.id === selectedId) ?? null,
    [drafts, selectedId],
  );
  const isNew = !!draft && !stored;
  const isDirty = !!draft && (isNew || JSON.stringify(draft) !== JSON.stringify(stored));

  const set = (patch: Partial<EventDraft>) => draft && setDraft({ ...draft, ...patch });

  const create = () => {
    setSelectedId(null);
    setDraft(newDraft());
  };

  const open = (d: EventDraft) => {
    setSelectedId(d.id);
    setDraft(structuredClone(d));
  };

  const idError = useMemo(() => {
    if (!draft) return null;
    if (!draft.id) return 'An id is required — it becomes the filename.';
    if (!isValidId(draft.id)) return 'Must be kebab-case: lowercase letters, digits and single hyphens.';
    // A collision inside the drafts folder would silently overwrite. A
    // collision with data/events is handled below, as a stage question.
    if (draft.id !== selectedId && drafts.some((d) => d.id === draft.id)) {
      return 'Another draft already uses this id.';
    }
    return null;
  }, [draft, drafts, selectedId]);

  /**
   * Stage and dataset are checkable against each other: a draft that claims to
   * have been added should have an entry, and an untouched one should not
   * collide with an existing event.
   */
  const stageWarning = useMemo(() => {
    if (!draft?.id) return null;
    const exists = existingIds.has(draft.id);
    const stage = stageOf(draft);
    if (stage === 'draft' && exists) {
      return `data/events/${draft.id}.json already exists. Drafting against an existing event is fine if you mean to enrich it — otherwise pick a different id.`;
    }
    if (stage !== 'draft' && !exists) {
      return `Marked “${STAGE_LABEL[stage]}”, but there is no data/events/${draft.id}.json. Either the entry was written under a different id, or this stage is ahead of reality.`;
    }
    return null;
  }, [draft, existingIds]);

  const save = async () => {
    if (!draft || idError) return;
    const next = cleanDraft(draft);
    setSaving(true);
    try {
      await saveEventDraft(next.id, next, selectedId ?? undefined);
      setDrafts((prev) => {
        const without = prev.filter((d) => d.id !== next.id && d.id !== selectedId);
        return [...without, next];
      });
      setSelectedId(next.id);
      setDraft(structuredClone(next));
      notify(`Saved sources/new-events/${next.id}.json`, 'success');
    } catch (e) {
      notify(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selectedId) return;
    if (!confirm(`Delete the draft "${draft?.name || selectedId}"? This removes its file.`)) return;
    try {
      await deleteEventDraft(selectedId);
      setDrafts((prev) => prev.filter((d) => d.id !== selectedId));
      setSelectedId(null);
      setDraft(null);
      notify('Draft deleted.', 'success');
    } catch (e) {
      notify(`Delete failed: ${(e as Error).message}`, 'error');
    }
  };

  if (!isReady) return <Loading label="Loading drafts…" />;

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Draft list */}
      <aside className="flex w-[300px] shrink-0 flex-col border-r border-clay bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="space-y-3 border-b border-clay p-4 dark:border-stone-800">
          <button
            onClick={create}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-terra px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-terra-dark"
          >
            <FilePlus2 size={14} /> New draft
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search drafts…"
              className="w-full rounded-xl border border-clay bg-sand/50 py-2 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-terra dark:border-stone-700 dark:bg-stone-800"
            />
          </div>
          <div className="flex gap-1">
            {([
              ['all', 'All', drafts.length],
              ...STAGES.map((s) => [s, STAGE_LABEL[s], counts[s]] as const),
            ] as [Filter, string, number][]).map(([value, label, count]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                title={value === 'all' ? 'Every draft' : STAGE_HINT[value]}
                className={`min-w-0 flex-1 rounded-lg px-1 py-1.5 text-[11px] font-bold transition-colors ${
                  filter === value
                    ? 'bg-terra text-white'
                    : 'text-charcoal-light hover:bg-clay/40 dark:text-stone-400 dark:hover:bg-stone-800'
                }`}
              >
                {label} {count}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {visible.length === 0 && (
            <p className="px-3 py-16 text-center text-sm italic leading-relaxed text-stone-400">
              {drafts.length ? 'No drafts match.' : 'No drafts yet. Start one with “New draft”.'}
            </p>
          )}
          {visible.map((d) => {
            const stage = stageOf(d);
            return (
              <button
                key={d.id}
                onClick={() => open(d)}
                className={`mb-1 flex w-full items-center gap-2 rounded-xl border p-3 text-left transition-all ${
                  d.id === selectedId
                    ? 'border-terra bg-terra/5 ring-1 ring-terra/20'
                    : 'border-transparent hover:border-clay hover:bg-clay/5 dark:hover:border-stone-800'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-bold leading-tight ${stage === 'done' ? 'text-charcoal-light dark:text-stone-400' : ''}`}>
                    {d.name || d.id}
                  </p>
                  <p className="truncate text-[10px] text-stone-400">{d.kind ?? 'kind not set'}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STAGE_STYLE[stage]}`}
                  title={STAGE_HINT[stage]}
                >
                  {STAGE_LABEL[stage]}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Editor */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        {!draft ? (
          <div className="flex h-full items-center justify-center px-8 text-center">
            <div className="max-w-sm space-y-2">
              <p className="font-serif text-lg font-bold text-terra">Draft Event</p>
              <p className="text-sm leading-relaxed text-charcoal-light dark:text-stone-400">
                Jot down an event that is not in the dataset yet — name it, then write what you know
                in plain prose. It is saved under{' '}
                <code className="font-mono text-xs">sources/new-events/</code> for a research pass
                to turn into a real entry.
              </p>
              <p className="text-sm text-stone-400">
                {drafts.length} on file — {counts.draft} waiting, {counts.added} added,{' '}
                {counts.done} done.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 p-6">
            <header className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-serif text-2xl font-black text-terra">
                  {draft.name || 'Untitled event'}
                </h1>
                <p className="mt-1 font-mono text-xs text-stone-400">
                  sources/new-events/{draft.id || '…'}.json
                </p>
                <div className="mt-3 inline-flex rounded-xl border border-clay p-0.5 dark:border-stone-700">
                  {STAGES.map((s) => {
                    const active = stageOf(draft) === s;
                    return (
                      <button
                        key={s}
                        onClick={() => set({ stage: s })}
                        title={STAGE_HINT[s]}
                        className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                          active
                            ? STAGE_ACTIVE[s]
                            : 'text-charcoal-light hover:bg-clay/40 dark:text-stone-400 dark:hover:bg-stone-800'
                        }`}
                      >
                        {STAGE_LABEL[s]}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-stone-400">{STAGE_HINT[stageOf(draft)]}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {stored && (
                  <button
                    onClick={remove}
                    className="flex items-center gap-1.5 rounded-xl border border-clay px-3 py-2 text-xs font-bold text-stone-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-stone-700 dark:hover:bg-red-950/30"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
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
                  <Save size={14} /> {isSaving ? 'Saving…' : 'Save draft'}
                </button>
              </div>
            </header>

            {stageWarning && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-400">
                  {stageWarning}
                </p>
              </div>
            )}

            {/* Identity — the only structured part */}
            <section className="space-y-4 rounded-2xl border border-clay bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <h2 className="font-serif font-bold">Identity</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput
                  label="Name"
                  value={draft.name}
                  placeholder="Festival of…"
                  onChange={(name) => set({
                    name,
                    // The id tracks the name until the draft has been saved
                    // once; after that it is the filename.
                    id: stored ? draft.id : slugify(name),
                  })}
                />
                <TextInput
                  label="Id"
                  mono
                  value={draft.id}
                  placeholder="festival-of-something"
                  hint={idError && <span className="text-red-600">{idError}</span>}
                  onChange={(id) => set({ id })}
                />
                <SelectInput
                  label="Kind"
                  value={draft.kind}
                  options={EVENT_KINDS}
                  optional
                  placeholder="— unknown —"
                  onChange={(kind) => set({ kind })}
                />
                <SelectInput
                  label="Status"
                  value={draft.status}
                  options={EVENT_STATUS}
                  optional
                  placeholder="— unknown —"
                  onChange={(status) => set({ status })}
                />
              </div>
              <ProvincePicker
                label="Provinces"
                hint="First is the primary host."
                value={draft.provinces ?? []}
                onChange={(provinces) => set({ provinces })}
              />
              <TextArea
                label="Description"
                rows={3}
                value={draft.description ?? ''}
                placeholder="What the event is, in a couple of sentences."
                onChange={(description) => set({ description })}
              />
            </section>

            <ProseSection
              title="Recurrence"
              value={draft.recurrence ?? ''}
              placeholder={PLACEHOLDERS.recurrence}
              onChange={(recurrence) => set({ recurrence })}
            />
            <ProseSection
              title="Links"
              value={draft.links ?? ''}
              placeholder={PLACEHOLDERS.links}
              onChange={(links) => set({ links })}
            />
            <ProseSection
              title="Editions"
              value={draft.editions ?? ''}
              placeholder={PLACEHOLDERS.editions}
              onChange={(editions) => set({ editions })}
            />
            <ProseSection
              title="Research brief"
              value={draft.research ?? ''}
              placeholder={PLACEHOLDERS.research}
              onChange={(research) => set({ research })}
            />
          </div>
        )}
      </main>

      <ToastContainer notifications={notifications} removeNotification={dismiss} />
    </div>
  );
}

/** One free-text block. The placeholder is the only instruction it needs. */
function ProseSection({ title, value, placeholder, onChange }: {
  title: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-clay bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <h2 className="font-serif font-bold">{title}</h2>
      <textarea
        className="w-full resize-y rounded-lg border border-clay bg-white px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-stone-400/70 focus:ring-1 focus:ring-terra dark:border-stone-700 dark:bg-stone-800"
        rows={6}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </section>
  );
}
