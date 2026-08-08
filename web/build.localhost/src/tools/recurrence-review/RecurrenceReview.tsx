import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, AlertTriangle, Check, CheckCircle2, Eye, History, Info, RotateCcw, Save, Search,
} from 'lucide-react';
import Loading from '../../components/Loading';
import { ToastContainer, type NotificationType } from '../../components/Notification';
import { fetchEvents, fetchReviewState, saveEvent, saveReviewState } from '../../utils/api';
import type { Event } from '../../data/schema';
import { analyze, worstSeverity, type Finding, type Recurrence, type Severity } from './analyze';
import {
  clearReviewed, emptyReviewState, markReviewed, reviewStatus,
  type ReviewState, type ReviewStatus,
} from './reviewState';
import RecurrenceForm from '../../components/RecurrenceForm';
import EvidenceTable from './EvidenceTable';

type Filter = 'all' | 'flagged' | 'serious' | 'reviewed';

const SEVERITY_RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

const SEVERITY_STYLE: Record<Severity, { chip: string; row: string; Icon: typeof Info }> = {
  error: {
    chip: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
    row: 'border-red-200 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/20',
    Icon: AlertCircle,
  },
  warning: {
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    row: 'border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20',
    Icon: AlertTriangle,
  },
  info: {
    chip: 'bg-ocean/15 text-ocean',
    row: 'border-clay bg-sand/60 dark:border-stone-800 dark:bg-stone-900/40',
    Icon: Info,
  },
};

/**
 * Recurrence Review — walks data/events, checks each event's declared
 * `spec.recurrence` against the dates of its own past editions, and lets the
 * disagreements be resolved one event at a time.
 *
 * Findings re-run against the working copy as it is edited, so accepting a
 * suggestion visibly clears the finding that proposed it. Nothing is written
 * until Save.
 */
export default function RecurrenceReview() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isReady, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Recurrence | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('flagged');
  const [review, setReview] = useState<ReviewState>(emptyReviewState);

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
    Promise.all([fetchEvents(), fetchReviewState<ReviewState>()])
      .then(([{ events: loaded, errors }, state]) => {
        setEvents(loaded.map((l) => l.event));
        setReview(state?.events ? state : emptyReviewState());
        if (errors.length) {
          notify(`${errors.length} event file(s) failed to parse (see console).`, 'error');
          console.warn('Unparseable event files:', errors);
        }
      })
      .catch((e) => notify(`Failed to load events: ${e.message}`, 'error'))
      .finally(() => setReady(true));
  }, [notify]);

  // Every event analysed as stored — this drives the list and its badges.
  const reviewed = useMemo(
    () => events.map((event) => {
      const findings = analyze(event).findings;
      return { event, findings, status: reviewStatus(findings, review.events[event.spec.id]) };
    }),
    [events, review],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviewed
      .filter(({ event, findings, status }) => {
        // Signed-off events get their own tab and stay out of the working ones.
        if (filter === 'reviewed' && status !== 'reviewed') return false;
        if (filter !== 'reviewed' && filter !== 'all' && status === 'reviewed') return false;
        if (filter === 'flagged' && !findings.length) return false;
        if (filter === 'serious' && !findings.some((f) => f.severity !== 'info')) return false;
        if (!q) return true;
        return event.spec.name.toLowerCase().includes(q) || event.spec.id.includes(q);
      })
      .sort((a, b) => {
        // Marks that went stale are the most urgent: something new turned up.
        if ((a.status === 'stale') !== (b.status === 'stale')) return a.status === 'stale' ? -1 : 1;
        const sa = worstSeverity(a.findings);
        const sb = worstSeverity(b.findings);
        const ra = sa ? SEVERITY_RANK[sa] : 3;
        const rb = sb ? SEVERITY_RANK[sb] : 3;
        return ra - rb || b.findings.length - a.findings.length
          || a.event.spec.name.localeCompare(b.event.spec.name);
      });
  }, [reviewed, query, filter]);

  const selected = useMemo(
    () => events.find((e) => e.spec.id === selectedId) ?? null,
    [events, selectedId],
  );

  // The live view: findings recomputed against the edits made so far.
  const live = useMemo(() => {
    if (!selected || !draft) return null;
    return analyze({ ...selected, spec: { ...selected.spec, recurrence: draft } });
  }, [selected, draft]);

  const isDirty = useMemo(
    () => !!selected && !!draft
      && JSON.stringify(draft) !== JSON.stringify(selected.spec.recurrence),
    [selected, draft],
  );

  const select = (event: Event) => {
    setSelectedId(event.spec.id);
    setDraft(structuredClone(event.spec.recurrence));
  };

  const applyFix = (finding: Finding) => {
    if (!finding.fix || !draft) return;
    setDraft({ ...draft, ...finding.fix.patch });
  };

  const save = async () => {
    if (!selected || !draft) return;
    const next: Event = { ...selected, spec: { ...selected.spec, recurrence: draft } };
    setSaving(true);
    try {
      await saveEvent(next);
      setEvents((prev) => prev.map((e) => (e.spec.id === next.spec.id ? next : e)));
      notify(`Saved recurrence for "${next.spec.name}".`, 'success');
    } catch (e) {
      notify(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    let flagged = 0;
    let serious = 0;
    let signedOff = 0;
    for (const { findings, status } of reviewed) {
      if (status === 'reviewed') { signedOff++; continue; }
      if (findings.length) flagged++;
      if (findings.some((f) => f.severity !== 'info')) serious++;
    }
    return { flagged, serious, reviewed: signedOff, clean: reviewed.length - flagged - signedOff };
  }, [reviewed]);

  // Status of the event on screen, against the findings currently shown.
  const selectedStatus: ReviewStatus = useMemo(
    () => (selected && live
      ? reviewStatus(live.findings, review.events[selected.spec.id])
      : 'unreviewed'),
    [selected, live, review],
  );

  // Review state is bookkeeping, so a failed write is worth a toast but must
  // not roll back what the reviewer sees.
  const persist = async (next: ReviewState, message: string) => {
    setReview(next);
    try {
      await saveReviewState(next);
      notify(message, 'success');
    } catch (e) {
      notify(`Could not write review-state.json: ${(e as Error).message}`, 'error');
    }
  };

  const toggleReviewed = () => {
    if (!selected || !live) return;
    const id = selected.spec.id;
    if (selectedStatus === 'reviewed') {
      persist(clearReviewed(review, id), `"${selected.spec.name}" moved back to the working list.`);
    } else {
      persist(
        markReviewed(review, id, live.findings),
        `"${selected.spec.name}" marked reviewed${live.findings.length ? ` with ${live.findings.length} accepted finding(s)` : ''}.`,
      );
    }
  };

  if (!isReady) return <Loading label="Loading events…" />;

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Event list */}
      <aside className="flex w-[320px] shrink-0 flex-col border-r border-clay bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="space-y-3 border-b border-clay p-4 dark:border-stone-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events…"
              className="w-full rounded-xl border border-clay bg-sand/50 py-2 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-terra dark:border-stone-700 dark:bg-stone-800"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {([
              ['serious', 'Serious', totals.serious],
              ['flagged', 'Flagged', totals.flagged],
              ['reviewed', 'Reviewed', totals.reviewed],
              ['all', 'All', reviewed.length],
            ] as [Filter, string, number][]).map(([value, label, count]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`min-w-[68px] flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors ${
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
            <p className="py-16 text-center text-sm italic text-stone-400">
              {filter === 'all' ? 'No events match.' : 'Nothing flagged here.'}
            </p>
          )}
          {visible.map(({ event, findings, status }) => {
            const severity = worstSeverity(findings);
            const active = event.spec.id === selectedId;
            return (
              <button
                key={event.spec.id}
                onClick={() => select(event)}
                className={`mb-1 flex w-full items-center gap-2 rounded-xl border p-3 text-left transition-all ${
                  active
                    ? 'border-terra bg-terra/5 ring-1 ring-terra/20'
                    : 'border-transparent hover:border-clay hover:bg-clay/5 dark:hover:border-stone-800'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-bold leading-tight ${status === 'reviewed' ? 'text-charcoal-light dark:text-stone-400' : ''}`}>
                    {event.spec.name}
                  </p>
                  <p className="truncate text-[10px] text-stone-400">
                    {status === 'stale' ? 'new findings since review' : event.kind}
                  </p>
                </div>
                {status === 'stale' && (
                  <History size={14} className="shrink-0 text-amber-500" aria-label="new findings since review" />
                )}
                {status === 'reviewed' && (
                  <Eye size={14} className="shrink-0 text-stone-400" aria-label="reviewed" />
                )}
                {severity ? (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      status === 'reviewed'
                        ? 'bg-clay/60 text-charcoal-light dark:bg-stone-800 dark:text-stone-500'
                        : SEVERITY_STYLE[severity].chip
                    }`}
                  >
                    {findings.length}
                  </span>
                ) : (
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Detail */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        {!selected || !draft || !live ? (
          <div className="flex h-full items-center justify-center px-8 text-center">
            <div className="max-w-sm space-y-2">
              <p className="font-serif text-lg font-bold text-terra">Recurrence Review</p>
              <p className="text-sm text-charcoal-light dark:text-stone-400">
                {totals.serious} event(s) have a recurrence that disagrees with their own edition
                dates, {totals.clean} look consistent, and {totals.reviewed} have been signed off.
                Pick one to review.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 p-6">
            <header className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="font-serif text-2xl font-black text-terra">{selected.spec.name}</h1>
                <p className="mt-1 font-mono text-xs text-stone-400">
                  {selected.spec.id} · {selected.kind} · {selected.spec.status}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={toggleReviewed}
                  title={
                    selectedStatus === 'reviewed'
                      ? 'Put this event back in the working list'
                      : 'Accept the findings below and move this event to the Reviewed tab'
                  }
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                    selectedStatus === 'reviewed'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                      : 'border-clay hover:bg-clay/20 dark:border-stone-700 dark:hover:bg-stone-800'
                  }`}
                >
                  <Eye size={14} /> {selectedStatus === 'reviewed' ? 'Reviewed' : 'Mark reviewed'}
                </button>
                <button
                  onClick={() => setDraft(structuredClone(selected.spec.recurrence))}
                  disabled={!isDirty}
                  className="flex items-center gap-1.5 rounded-xl border border-clay px-3 py-2 text-xs font-bold transition-colors hover:bg-clay/20 disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800"
                >
                  <RotateCcw size={14} /> Revert
                </button>
                <button
                  onClick={save}
                  disabled={!isDirty || isSaving}
                  className="flex items-center gap-1.5 rounded-xl bg-terra px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-terra-dark disabled:opacity-40"
                >
                  <Save size={14} /> {isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </header>

            {selectedStatus === 'stale' && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                <History size={18} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-400">
                  Reviewed on{' '}
                  {new Date(review.events[selected.spec.id].reviewedAt).toLocaleDateString()}, but
                  findings have come up since that were not part of that sign-off. Mark it reviewed
                  again to accept the current set.
                </p>
              </div>
            )}

            <section className="rounded-2xl border border-clay bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <h2 className="mb-4 font-serif font-bold">Declared recurrence</h2>
              <RecurrenceForm
                value={draft}
                onChange={setDraft}
                flaggedFields={new Set(live.findings.map((f) => f.field))}
              />
            </section>

            <section className="space-y-2">
              <h2 className="font-serif font-bold">
                Findings{' '}
                <span className="text-sm font-normal text-stone-400">
                  {isDirty ? '(against your edits)'
                    : selectedStatus === 'reviewed' ? '(accepted at review)'
                    : '(as stored)'}
                </span>
              </h2>
              {live.findings.length === 0 ? (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                  <p className="text-sm text-emerald-800 dark:text-emerald-400">
                    The declared recurrence agrees with every edition on record.
                  </p>
                </div>
              ) : (
                live.findings.map((f) => {
                  const { row, Icon } = SEVERITY_STYLE[f.severity];
                  return (
                    <div key={f.id} className={`flex gap-3 rounded-2xl border p-4 ${row}`}>
                      <Icon size={18} className="mt-0.5 shrink-0 opacity-70" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{f.message}</p>
                        <p className="mt-1 text-xs leading-relaxed text-charcoal-light dark:text-stone-400">
                          {f.detail}
                        </p>
                      </div>
                      {f.fix && (
                        <button
                          onClick={() => applyFix(f)}
                          title={f.fix.label}
                          className="flex h-fit shrink-0 items-center gap-1.5 rounded-lg border border-current px-2.5 py-1.5 text-[11px] font-bold opacity-80 transition-opacity hover:opacity-100"
                        >
                          <Check size={13} /> Apply
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </section>

            <section className="rounded-2xl border border-clay bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <h2 className="mb-4 font-serif font-bold">
                Editions{' '}
                <span className="text-sm font-normal text-stone-400">the evidence above</span>
              </h2>
              <EvidenceTable evidence={live.evidence} />
            </section>
          </div>
        )}
      </main>

      <ToastContainer notifications={notifications} removeNotification={dismiss} />
    </div>
  );
}
