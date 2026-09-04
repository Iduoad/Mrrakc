import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, HelpCircle, CalendarDays, Map as MapIcon, CalendarClock } from 'lucide-react';
import type { AgendaEventDTO } from '../../types/agenda';
import { MONTH_NAMES, SEASON_MONTHS, formatEditionDates, type RecurrenceType } from '../../utils/recurrence';
import { pickNextEdition } from '../../utils/calendar';
import EventModal, { TYPE_ICONS, TYPE_COLORS } from './EventModal';
import AgendaFilters from './AgendaFilters';

type NextEdition = ReturnType<typeof pickNextEdition>;

// Map libraries are heavy; only fetch them when the map view is opened.
const AgendaMap = lazy(() => import('./AgendaMap'));

interface Props {
    events: AgendaEventDTO[];
}

interface Placement {
    monthIndex: number;
    approx: boolean;
    /** This month is the tail of a run that started in an earlier one, not a
     *  separate occurrence. */
    continuation: boolean;
}

const PART_ORDER: Record<string, number> = {
    'early': 0, 'first-half': 1, 'mid': 2, 'full': 3, 'second-half': 4, 'late': 5,
};

export type EventStatus = AgendaEventDTO['status'];

/** Most-alive first, which is also the order the chips read in. */
export const STATUS_ORDER: EventStatus[] = ['active', 'unknown', 'discontinued'];

/** Unknown events may well still run, so they show; discontinued ones won't. */
export const DEFAULT_STATUSES: EventStatus[] = ['active', 'unknown'];

const sameStatuses = (a: EventStatus[], b: EventStatus[]) =>
    a.length === b.length && STATUS_ORDER.every(s => a.includes(s) === b.includes(s));

function placementsFor(event: AgendaEventDTO): Placement[] | null {
    const rec = event.recurrence;
    switch (rec.type) {
        case 'gregorian':
            // Several months means one run spanning them: the first is where the
            // event starts, the rest are it continuing.
            return (rec.months ?? []).map((m, i) => ({ monthIndex: m - 1, approx: false, continuation: i > 0 }));
        case 'hijri':
            // Approximate Gregorian month computed at build time (drifts ~11 days/year).
            return event.approxMonth
                ? [{ monthIndex: event.approxMonth - 1, approx: true, continuation: false }]
                : null;
        case 'seasonal':
            // Three months means "somewhere in this season" — not one long run.
            return (SEASON_MONTHS[rec.season ?? 'summer'] ?? [])
                .map(m => ({ monthIndex: m - 1, approx: true, continuation: false }));
        case 'irregular':
            return null;
    }
}

function EventEntry({ event, approx, continuation, next, onClick }: {
    event: AgendaEventDTO;
    approx: boolean;
    continuation?: boolean;
    next: NextEdition;
    onClick: () => void;
}) {
    const TypeIcon = TYPE_ICONS[event.recurrence.type];
    const inactive = event.status !== 'active';
    const upcoming = next ? (formatEditionDates(next.startDate, next.endDate) ?? String(next.year)) : undefined;
    const from = continuation ? MONTH_NAMES[(event.recurrence.months?.[0] ?? 1) - 1] : undefined;
    return (
        <button
            onClick={onClick}
            title={from ? `Continues from ${from}` : undefined}
            className={`w-full flex items-start gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-clay/10 dark:hover:bg-charcoal-light/10 transition-colors ${inactive ? 'opacity-60' : continuation ? 'opacity-70' : ''}`}
        >
            <TypeIcon size={14} className={`mt-0.5 shrink-0 ${TYPE_COLORS[event.recurrence.type]}`} />
            <span className="min-w-0 flex-grow">
                <span className={`block text-sm font-medium text-charcoal dark:text-stone-200 truncate ${inactive ? 'line-through decoration-charcoal-light/60' : ''}`}>
                    {continuation && <span className="text-charcoal-light dark:text-stone-500">→ </span>}
                    {event.name}
                </span>
                <span className="block text-xs text-charcoal-light dark:text-stone-500 truncate">
                    {event.provinces.map(p => p.name).join(' · ')}
                    {inactive && <span className="capitalize"> · {event.status}</span>}
                </span>
            </span>
            {upcoming && (
                <span
                    className="inline-flex items-center shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400"
                    title={`Upcoming edition: ${upcoming}`}
                >
                    <CalendarClock size={13} />
                </span>
            )}
            {approx && (
                <span className="text-xs text-charcoal-light dark:text-stone-500 shrink-0" title="Approximate month">≈</span>
            )}
        </button>
    );
}

const EVENTS_PER_MONTH_LIMIT = 6;

interface MonthCardProps {
    monthName: string;
    entries: { event: AgendaEventDTO; approx: boolean; continuation: boolean }[];
    nextByEvent: Map<string, NextEdition>;
    selectedCategory: string;
    onSelectEvent: (event: AgendaEventDTO) => void;
}

function MonthCard({
    monthName,
    entries,
    nextByEvent,
    selectedCategory,
    onSelectEvent,
}: MonthCardProps) {
    const [expanded, setExpanded] = useState(false);

    // Reset expansion state when category filter changes
    useEffect(() => {
        setExpanded(false);
    }, [selectedCategory]);

    const totalCount = entries.length;
    const hasMore = totalCount > EVENTS_PER_MONTH_LIMIT;
    const visibleEntries = expanded || !hasMore ? entries : entries.slice(0, EVENTS_PER_MONTH_LIMIT);
    const remainingCount = totalCount - EVENTS_PER_MONTH_LIMIT;

    return (
        <div className="bg-white dark:bg-charcoal border border-clay/20 dark:border-charcoal-light rounded-2xl p-4 flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-serif font-bold text-charcoal dark:text-stone-100">{monthName}</h3>
                    {totalCount > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-clay/10 dark:bg-charcoal-light/40 text-charcoal-light dark:text-stone-400">
                            {totalCount}
                        </span>
                    )}
                </div>
                {totalCount > 0 ? (
                    <div className="space-y-0.5 -mx-2">
                        {visibleEntries.map(({ event, approx, continuation }) => (
                            <EventEntry
                                key={event.id}
                                event={event}
                                approx={approx}
                                continuation={continuation}
                                next={nextByEvent.get(event.id) ?? null}
                                onClick={() => onSelectEvent(event)}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-charcoal-light/60 dark:text-stone-600">No events</p>
                )}
            </div>

            {hasMore && (
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="mt-3 w-full py-1.5 px-3 text-xs font-medium rounded-xl text-charcoal-light dark:text-stone-400 hover:text-terra dark:hover:text-terra border border-clay/20 dark:border-charcoal-light hover:border-terra/50 hover:bg-clay/5 dark:hover:bg-charcoal-light/30 transition-all text-center"
                >
                    {expanded ? 'Show less' : `+ ${remainingCount} more in ${monthName}`}
                </button>
            )}
        </div>
    );
}

export default function AgendaCalendar({ events }: Props) {
    const [viewMode, setViewMode] = useState<'calendar' | 'map'>('calendar');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedKinds, setSelectedKinds] = useState<string[]>([]);
    const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<EventStatus[]>(DEFAULT_STATUSES);
    const [upcomingOnly, setUpcomingOnly] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [activeEvent, setActiveEvent] = useState<AgendaEventDTO | null>(null);

    // Sync selectedCategory with ?category= URL query param on mount and popstate
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const cat = params.get('category');
        if (cat) {
            setSelectedCategory(cat.toLowerCase());
        }
        const onPopState = () => {
            const p = new URLSearchParams(window.location.search);
            setSelectedCategory(p.get('category')?.toLowerCase() || 'all');
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    const handleCategoryChange = (cat: string) => {
        setSelectedCategory(cat);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (cat === 'all') {
                url.searchParams.delete('category');
            } else {
                url.searchParams.set('category', cat);
            }
            window.history.replaceState({}, '', url.toString());
        }
    };

    // Returning from an event's detail page restores this island from the
    // back/forward cache with its state intact — close the modal so Back lands
    // on the list, not the modal it was opened from.
    useEffect(() => {
        const onPageShow = (e: PageTransitionEvent) => {
            if (e.persisted) setActiveEvent(null);
        };
        window.addEventListener('pageshow', onPageShow);
        return () => window.removeEventListener('pageshow', onPageShow);
    }, []);

    // "Next" edition is computed in the browser against the real current date,
    // so the upcoming cue stays correct between deploys (see AgendaEventDTO).
    const now = useMemo(() => new Date(), []);
    const nextByEvent = useMemo(
        () => new Map(events.map(e => [e.id, pickNextEdition(e.futureEditions, now)] as const)),
        [events, now]
    );
    const statusCounts = useMemo(() => {
        const counts = {} as Record<EventStatus, number>;
        for (const e of events) counts[e.status] = (counts[e.status] ?? 0) + 1;
        return counts;
    }, [events]);
    const availableStatuses = useMemo(
        () => STATUS_ORDER.filter(s => statusCounts[s] > 0),
        [statusCounts]
    );
    const upcomingCount = useMemo(
        () => events.reduce((n, e) => n + (nextByEvent.get(e.id) ? 1 : 0), 0),
        [events, nextByEvent]
    );

    const availableCategories = useMemo(() => {
        const cats = new Set<string>();
        for (const e of events) {
            const top = e.kind.split('/')[0];
            if (top) cats.add(top);
        }
        return Array.from(cats).sort();
    }, [events]);

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { all: events.length };
        for (const e of events) {
            const top = e.kind.split('/')[0];
            counts[top] = (counts[top] ?? 0) + 1;
        }
        return counts;
    }, [events]);

    const availableKinds = useMemo(
        () => [...new Set(events.map(e => e.kind))].sort(),
        [events]
    );
    const availableProvinces = useMemo(
        () => [...new Set(events.flatMap(e => e.provinces.map(p => p.slug)))].sort(),
        [events]
    );
    const provinceLabels = useMemo(
        () => Object.fromEntries(events.flatMap(e => e.provinces.map(p => [p.slug, p.name]))),
        [events]
    );
    const availableTypes = useMemo(
        () => (['gregorian', 'hijri', 'seasonal', 'irregular'] as RecurrenceType[])
            .filter(t => events.some(e => e.recurrence.type === t)),
        [events]
    );

    const toggle = <T extends string>(setter: React.Dispatch<React.SetStateAction<T[]>>) => (value: T) =>
        setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);

    // Status starts pre-selected rather than empty, so it counts as a filter only
    // once it differs from that default.
    const statusFiltered = !sameStatuses(selectedStatuses, DEFAULT_STATUSES);
    const activeFilterCount = (selectedCategory !== 'all' ? 1 : 0) + selectedKinds.length + selectedProvinces.length + selectedTypes.length
        + (upcomingOnly ? 1 : 0) + (statusFiltered ? 1 : 0);

    const filteredEvents = useMemo(() => events.filter(e => {
        const topLevelCat = e.kind.split('/')[0];
        const categoryMatches = selectedCategory === 'all' || topLevelCat === selectedCategory || e.kind.startsWith(selectedCategory + '/');
        return (
            categoryMatches &&
            selectedStatuses.includes(e.status) &&
            (!upcomingOnly || Boolean(nextByEvent.get(e.id))) &&
            (selectedKinds.length === 0 || selectedKinds.includes(e.kind)) &&
            (selectedProvinces.length === 0 || e.provinces.some(p => selectedProvinces.includes(p.slug))) &&
            (selectedTypes.length === 0 || selectedTypes.includes(e.recurrence.type))
        );
    }), [events, selectedCategory, selectedStatuses, upcomingOnly, nextByEvent, selectedKinds, selectedProvinces, selectedTypes]);

    const { buckets, noFixedDates, hasContinuation } = useMemo(() => {
        const buckets: { event: AgendaEventDTO; approx: boolean; continuation: boolean }[][] =
            Array.from({ length: 12 }, () => []);
        const noFixedDates: AgendaEventDTO[] = [];
        let hasContinuation = false;
        for (const event of filteredEvents) {
            const placements = placementsFor(event);
            if (!placements) {
                noFixedDates.push(event);
                continue;
            }
            for (const { monthIndex, approx, continuation } of placements) {
                buckets[monthIndex].push({ event, approx, continuation });
                hasContinuation ||= continuation;
            }
        }
        for (const bucket of buckets) {
            // A continuation was already under way when the month began, so it
            // sorts ahead of everything starting in it.
            const rank = (x: typeof bucket[number]) => x.continuation
                ? -1
                : PART_ORDER[x.event.recurrence.part ?? 'full'] ?? 3;
            bucket.sort((a, b) => rank(a) - rank(b) || a.event.name.localeCompare(b.event.name));
        }
        noFixedDates.sort((a, b) => a.name.localeCompare(b.name));
        return { buckets, noFixedDates, hasContinuation };
    }, [filteredEvents]);

    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="inline-flex rounded-full border border-clay/20 dark:border-charcoal-light p-1 bg-white dark:bg-charcoal">
                    {([['calendar', CalendarDays], ['map', MapIcon]] as const).map(([mode, Icon]) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-full transition-colors capitalize ${viewMode === mode
                                ? 'bg-terra text-white'
                                : 'text-charcoal-light dark:text-stone-400 hover:text-terra'
                                }`}
                        >
                            <Icon size={14} />
                            {mode}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setFiltersOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-charcoal border border-clay/20 dark:border-charcoal-light rounded-xl hover:border-terra/50 text-charcoal dark:text-stone-200 transition-colors"
                    >
                        <SlidersHorizontal size={16} />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="bg-terra text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-5">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-8 text-xs text-charcoal-light dark:text-stone-400">
                {availableTypes.map(type => {
                    const TypeIcon = TYPE_ICONS[type];
                    return (
                        <span key={type} className="inline-flex items-center gap-1">
                            <TypeIcon size={12} className={TYPE_COLORS[type]} />
                            <span className="capitalize">{type}</span>
                        </span>
                    );
                })}
                <span className="inline-flex items-center gap-1">
                    <span className="font-bold">≈</span> approximate month
                </span>
                {hasContinuation && (
                    <span className="inline-flex items-center gap-1">
                        <span className="font-bold">→</span> continues from previous month
                    </span>
                )}
                {upcomingCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                        <CalendarClock size={12} className="text-emerald-600 dark:text-emerald-400" /> upcoming edition
                    </span>
                )}
                {selectedStatuses.some(s => s !== 'active') && (
                    <span className="inline-flex items-center gap-1">
                        <span className="line-through decoration-charcoal-light/60">Aa</span>
                        {selectedStatuses.filter(s => s !== 'active').join(' / ')}
                    </span>
                )}
            </div>

            {/* Category Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
                <button
                    onClick={() => handleCategoryChange('all')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all duration-200 ${selectedCategory === 'all'
                        ? 'bg-terra text-white border-terra shadow-sm'
                        : 'bg-white dark:bg-charcoal text-charcoal-light dark:text-stone-300 border-clay/20 dark:border-charcoal-light hover:border-terra/50 hover:text-terra'
                    }`}
                >
                    <span>All</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCategory === 'all'
                        ? 'bg-white/20 text-white font-bold'
                        : 'bg-clay/10 dark:bg-charcoal-light/30 text-charcoal-light dark:text-stone-400'
                    }`}>
                        {categoryCounts['all'] ?? events.length}
                    </span>
                </button>
                {availableCategories.map(cat => {
                    const isSelected = selectedCategory === cat;
                    return (
                        <button
                            key={cat}
                            onClick={() => handleCategoryChange(cat)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide capitalize border transition-all duration-200 ${isSelected
                                ? 'bg-terra text-white border-terra shadow-sm'
                                : 'bg-white dark:bg-charcoal text-charcoal-light dark:text-stone-300 border-clay/20 dark:border-charcoal-light hover:border-terra/50 hover:text-terra'
                            }`}
                        >
                            <span>{cat}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected
                                ? 'bg-white/20 text-white font-bold'
                                : 'bg-clay/10 dark:bg-charcoal-light/30 text-charcoal-light dark:text-stone-400'
                            }`}>
                                {categoryCounts[cat] ?? 0}
                            </span>
                        </button>
                    );
                })}
            </div>

            {viewMode === 'map' && (
                <Suspense fallback={
                    <div className="h-[70vh] rounded-2xl border border-clay/20 dark:border-charcoal-light flex items-center justify-center text-charcoal-light dark:text-stone-400">
                        Loading map…
                    </div>
                }>
                    <AgendaMap
                        events={filteredEvents}
                        activeEventId={activeEvent?.id}
                        onSelect={setActiveEvent}
                    />
                </Suspense>
            )}

            {/* Month grid */}
            <div className={viewMode === 'calendar' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start' : 'hidden'}>
                {MONTH_NAMES.map((monthName, i) => (
                    <MonthCard
                        key={monthName}
                        monthName={monthName}
                        entries={buckets[i]}
                        nextByEvent={nextByEvent}
                        selectedCategory={selectedCategory}
                        onSelectEvent={setActiveEvent}
                    />
                ))}
            </div>

            {/* No fixed dates strip */}
            {viewMode === 'calendar' && noFixedDates.length > 0 && (
                <div className="mt-4 bg-white dark:bg-charcoal border border-clay/20 dark:border-charcoal-light rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <HelpCircle size={16} className={TYPE_COLORS.irregular} />
                            <h3 className="font-serif font-bold text-charcoal dark:text-stone-100">No fixed dates</h3>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-clay/10 dark:bg-charcoal-light/40 text-charcoal-light dark:text-stone-400">
                            {noFixedDates.length}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 -mx-2">
                        {noFixedDates.map(event => (
                            <EventEntry
                                key={event.id}
                                event={event}
                                approx={false}
                                next={nextByEvent.get(event.id) ?? null}
                                onClick={() => setActiveEvent(event)}
                            />
                        ))}
                    </div>
                </div>
            )}

            <AgendaFilters
                isOpen={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                availableKinds={availableKinds}
                availableProvinces={availableProvinces}
                availableTypes={availableTypes}
                provinceLabels={provinceLabels}
                availableStatuses={availableStatuses}
                statusCounts={statusCounts}
                hasUpcoming={upcomingCount > 0}
                upcomingCount={upcomingCount}
                selectedKinds={selectedKinds}
                selectedProvinces={selectedProvinces}
                selectedTypes={selectedTypes}
                selectedStatuses={selectedStatuses}
                upcomingOnly={upcomingOnly}
                statusFiltered={statusFiltered}
                onKindChange={toggle(setSelectedKinds)}
                onProvinceChange={toggle(setSelectedProvinces)}
                onTypeChange={toggle(setSelectedTypes)}
                onStatusChange={toggle(setSelectedStatuses)}
                onUpcomingChange={() => setUpcomingOnly(v => !v)}
                onClearFilters={() => {
                    handleCategoryChange('all');
                    setSelectedKinds([]);
                    setSelectedProvinces([]);
                    setSelectedTypes([]);
                    setSelectedStatuses(DEFAULT_STATUSES);
                    setUpcomingOnly(false);
                }}
            />

            <EventModal
                event={activeEvent}
                onClose={() => setActiveEvent(null)}
            />
        </div>
    );
}
