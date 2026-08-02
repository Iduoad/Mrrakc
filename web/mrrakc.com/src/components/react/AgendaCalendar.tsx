import { lazy, Suspense, useMemo, useState } from 'react';
import { SlidersHorizontal, HelpCircle, CalendarDays, Map as MapIcon, CalendarClock, CalendarPlus, Eye } from 'lucide-react';
import type { AgendaEventDTO } from '../../types/agenda';
import { MONTH_NAMES, SEASON_MONTHS, formatEditionDates, type RecurrenceType } from '../../utils/recurrence';
import { pickNextEdition, buildICS, downloadICS, type CalItem } from '../../utils/calendar';
import EventModal, { TYPE_ICONS, TYPE_COLORS } from './EventModal';
import AgendaFilters from './AgendaFilters';

type NextEdition = ReturnType<typeof pickNextEdition>;

function toCalItem(event: AgendaEventDTO, next: NonNullable<NextEdition>): CalItem {
    return {
        id: event.id,
        name: event.name,
        provinces: event.provinces.map(p => p.name),
        year: next.year,
        edition: next.edition,
        startDate: next.startDate,
        endDate: next.endDate,
    };
}

// Map libraries are heavy; only fetch them when the map view is opened.
const AgendaMap = lazy(() => import('./AgendaMap'));

interface Props {
    events: AgendaEventDTO[];
}

interface Placement {
    monthIndex: number;
    approx: boolean;
}

const PART_ORDER: Record<string, number> = {
    'early': 0, 'first-half': 1, 'mid': 2, 'full': 3, 'second-half': 4, 'late': 5,
};

function placementsFor(event: AgendaEventDTO): Placement[] | null {
    const rec = event.recurrence;
    switch (rec.type) {
        case 'gregorian':
            return (rec.months ?? []).map(m => ({ monthIndex: m - 1, approx: false }));
        case 'hijri':
            // Approximate Gregorian month computed at build time (drifts ~11 days/year).
            return event.approxMonth ? [{ monthIndex: event.approxMonth - 1, approx: true }] : null;
        case 'seasonal':
            return (SEASON_MONTHS[rec.season ?? 'summer'] ?? []).map(m => ({ monthIndex: m - 1, approx: true }));
        case 'irregular':
            return null;
    }
}

function EventEntry({ event, approx, next, onClick }: { event: AgendaEventDTO; approx: boolean; next: NextEdition; onClick: () => void }) {
    const TypeIcon = TYPE_ICONS[event.recurrence.type];
    const inactive = event.status !== 'active';
    const upcoming = next ? (formatEditionDates(next.startDate, next.endDate) ?? String(next.year)) : undefined;
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-start gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-clay/10 dark:hover:bg-charcoal-light/10 transition-colors ${inactive ? 'opacity-60' : ''}`}
        >
            <TypeIcon size={14} className={`mt-0.5 shrink-0 ${TYPE_COLORS[event.recurrence.type]}`} />
            <span className="min-w-0 flex-grow">
                <span className={`block text-sm font-medium text-charcoal dark:text-stone-200 truncate ${inactive ? 'line-through decoration-charcoal-light/60' : ''}`}>
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

export default function AgendaCalendar({ events }: Props) {
    const [viewMode, setViewMode] = useState<'calendar' | 'map'>('calendar');
    const [selectedKinds, setSelectedKinds] = useState<string[]>([]);
    const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [showInactive, setShowInactive] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [activeEvent, setActiveEvent] = useState<AgendaEventDTO | null>(null);

    // "Next" edition is computed in the browser against the real current date,
    // so the upcoming cue stays correct between deploys (see AgendaEventDTO).
    const now = useMemo(() => new Date(), []);
    const nextByEvent = useMemo(
        () => new Map(events.map(e => [e.id, pickNextEdition(e.futureEditions, now)] as const)),
        [events, now]
    );
    const inactiveCount = useMemo(() => events.filter(e => e.status !== 'active').length, [events]);

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

    const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (value: string) =>
        setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);

    const activeFilterCount = selectedKinds.length + selectedProvinces.length + selectedTypes.length;

    const filteredEvents = useMemo(() => events.filter(e =>
        (showInactive || e.status === 'active') &&
        (selectedKinds.length === 0 || selectedKinds.includes(e.kind)) &&
        (selectedProvinces.length === 0 || e.provinces.some(p => selectedProvinces.includes(p.slug))) &&
        (selectedTypes.length === 0 || selectedTypes.includes(e.recurrence.type))
    ), [events, showInactive, selectedKinds, selectedProvinces, selectedTypes]);

    // Visible events that have a concrete upcoming date → exportable to calendar.
    const exportItems = useMemo(() => {
        const items: CalItem[] = [];
        for (const e of filteredEvents) {
            const next = nextByEvent.get(e.id);
            if (next) items.push(toCalItem(e, next));
        }
        return items;
    }, [filteredEvents, nextByEvent]);

    const handleExportAll = () => {
        if (exportItems.length === 0) return;
        downloadICS('mrrakc-agenda.ics', buildICS(exportItems));
    };

    const { buckets, noFixedDates } = useMemo(() => {
        const buckets: { event: AgendaEventDTO; approx: boolean }[][] = Array.from({ length: 12 }, () => []);
        const noFixedDates: AgendaEventDTO[] = [];
        for (const event of filteredEvents) {
            const placements = placementsFor(event);
            if (!placements) {
                noFixedDates.push(event);
                continue;
            }
            for (const { monthIndex, approx } of placements) {
                buckets[monthIndex].push({ event, approx });
            }
        }
        for (const bucket of buckets) {
            bucket.sort((a, b) => {
                const pa = PART_ORDER[a.event.recurrence.part ?? 'full'] ?? 3;
                const pb = PART_ORDER[b.event.recurrence.part ?? 'full'] ?? 3;
                return pa - pb || a.event.name.localeCompare(b.event.name);
            });
        }
        noFixedDates.sort((a, b) => a.name.localeCompare(b.name));
        return { buckets, noFixedDates };
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
                    {inactiveCount > 0 && (
                        <button
                            onClick={() => setShowInactive(v => !v)}
                            aria-pressed={showInactive}
                            title="Show discontinued & unknown events"
                            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-xl transition-colors ${showInactive
                                ? 'bg-terra text-white border-terra'
                                : 'bg-white dark:bg-charcoal border-clay/20 dark:border-charcoal-light text-charcoal-light dark:text-stone-400 hover:border-terra/50'
                                }`}
                        >
                            <Eye size={16} />
                            <span className="hidden sm:inline">Inactive</span>
                            <span className={`text-xs font-bold rounded-full px-1.5 py-0.5 min-w-5 ${showInactive ? 'bg-white/25 text-white' : 'bg-clay/20 dark:bg-charcoal-light/40'}`}>
                                {inactiveCount}
                            </span>
                        </button>
                    )}

                    <button
                        onClick={handleExportAll}
                        disabled={exportItems.length === 0}
                        title={exportItems.length === 0 ? 'No upcoming dated events to export' : `Download ${exportItems.length} upcoming event${exportItems.length > 1 ? 's' : ''} as .ics`}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-xl transition-colors ${exportItems.length === 0
                            ? 'bg-white dark:bg-charcoal border-clay/20 dark:border-charcoal-light text-charcoal-light/50 dark:text-stone-600 cursor-not-allowed'
                            : 'bg-white dark:bg-charcoal border-clay/20 dark:border-charcoal-light text-charcoal dark:text-stone-200 hover:border-terra/50'
                            }`}
                    >
                        <CalendarPlus size={16} />
                        <span className="hidden sm:inline">Add all</span>
                        {exportItems.length > 0 && (
                            <span className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full px-1.5 py-0.5 min-w-5">
                                {exportItems.length}
                            </span>
                        )}
                    </button>

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
                {exportItems.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                        <CalendarClock size={12} className="text-emerald-600 dark:text-emerald-400" /> upcoming edition
                    </span>
                )}
                {showInactive && inactiveCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                        <span className="line-through decoration-charcoal-light/60">Aa</span> discontinued / unknown
                    </span>
                )}
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
            <div className={viewMode === 'calendar' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'hidden'}>
                {MONTH_NAMES.map((monthName, i) => (
                    <div
                        key={monthName}
                        className="bg-white dark:bg-charcoal border border-clay/20 dark:border-charcoal-light rounded-2xl p-4"
                    >
                        <div className="flex items-baseline justify-between mb-2">
                            <h3 className="font-serif font-bold text-charcoal dark:text-stone-100">{monthName}</h3>
                            {buckets[i].length > 0 && (
                                <span className="text-xs text-charcoal-light dark:text-stone-500">{buckets[i].length}</span>
                            )}
                        </div>
                        {buckets[i].length > 0 ? (
                            <div className="space-y-0.5 -mx-2">
                                {buckets[i].map(({ event, approx }) => (
                                    <EventEntry
                                        key={event.id}
                                        event={event}
                                        approx={approx}
                                        next={nextByEvent.get(event.id) ?? null}
                                        onClick={() => setActiveEvent(event)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-charcoal-light/60 dark:text-stone-600">No events</p>
                        )}
                    </div>
                ))}
            </div>

            {/* No fixed dates strip */}
            {viewMode === 'calendar' && noFixedDates.length > 0 && (
                <div className="mt-4 bg-white dark:bg-charcoal border border-clay/20 dark:border-charcoal-light rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <HelpCircle size={16} className={TYPE_COLORS.irregular} />
                        <h3 className="font-serif font-bold text-charcoal dark:text-stone-100">No fixed dates</h3>
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
                selectedKinds={selectedKinds}
                selectedProvinces={selectedProvinces}
                selectedTypes={selectedTypes}
                onKindChange={toggle(setSelectedKinds)}
                onProvinceChange={toggle(setSelectedProvinces)}
                onTypeChange={toggle(setSelectedTypes)}
                onClearFilters={() => {
                    setSelectedKinds([]);
                    setSelectedProvinces([]);
                    setSelectedTypes([]);
                }}
            />

            <EventModal
                event={activeEvent}
                onClose={() => setActiveEvent(null)}
            />
        </div>
    );
}
