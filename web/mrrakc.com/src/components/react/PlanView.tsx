import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useInView } from 'react-intersection-observer';
import {
    MapPin,
    Clock,
    Mountain,
    Footprints,
    Utensils,
    BedDouble,
    Coffee,
    User,
    ChevronDown,
    Navigation,
    Car,
    Bus,
    Plane,
    Train,
    PawPrint,
    Play,
    ChevronRight,
    ChevronLeft,
    CheckCircle2
} from 'lucide-react';
import MapBottomSheet from './MapBottomSheet';
import MarkdownRenderer from './MarkdownRenderer';

interface Place {
    id: string;
    kind: string;
    spec: {
        name: string;
        description: string;
        location: {
            province: string;
            latitude: number;
            longitude: number;
        };
        [key: string]: any;
    };
    [key: string]: any;
}

interface Person {
    id: string;
    kind: string;
    spec: {
        name: string;
        role: string;
        [key: string]: any;
    };
    [key: string]: any;
}

interface Step {
    title: string;
    description?: string;
    type: string;
    optional?: boolean;
    places?: Place[];
    people?: {
        id: string;
        role: string;
        details?: Person;
    }[];
    transportToNext?: {
        mode: string;
        durationMin: number;
        advice?: string;
    };
    subSteps?: Step[];
}

interface Plan {
    id: string;
    kind: string;
    spec: {
        title?: string;
        estimatedDuration: {
            value: number;
            unit: string;
        };
        difficulty: string;
        steps: Step[];
    };
}

interface Props {
    plan: Plan;
    children?: React.ReactNode;
}

const getStepIcon = (type: string) => {
    switch (type) {
        case 'waypoint': return <MapPin size={20} />;
        case 'activity': return <Footprints size={20} />;
        case 'break': return <Coffee size={20} />;
        case 'overnight': return <BedDouble size={20} />;
        default: return <MapPin size={20} />;
    }
};

const StepCard = ({ step, index, isActive, onInView, onClick }: { step: Step; index: number; isActive: boolean; onInView?: (inView: boolean) => void, onClick?: () => void }) => {
    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: '-45% 0px -45% 0px',
        onChange: (inView) => onInView && onInView(inView),
    });

    return (
        <div
            ref={onInView ? ref : undefined}
            onClick={onClick}
            className={`relative pl-8 pb-12 last:pb-0 transition-opacity duration-500 cursor-pointer ${isActive ? 'opacity-100' : 'opacity-60 hover:opacity-80'}`}
        >
            {/* Timeline Line */}
            <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-clay/20 dark:bg-charcoal-light/20"></div>

            {/* Step Marker */}
            <div className={`absolute left-0 top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-300 z-10
                ${isActive ? 'bg-terra border-terra text-white' : 'bg-white dark:bg-charcoal border-clay/30 text-clay-dark'}`}>
                <span className="text-[10px] font-bold">{index + 1}</span>
            </div>

            <div className={`bg-white dark:bg-charcoal rounded-2xl p-6 border transition-all duration-300
                ${isActive ? 'border-terra/30 shadow-lg shadow-terra/5' : 'border-clay/20 dark:border-charcoal-light shadow-sm'}`}>

                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <div className="flex items-center gap-2 text-terra mb-1">
                            {getStepIcon(step.type)}
                            <span className="text-xs font-bold uppercase tracking-wider">{step.type}</span>
                            {step.optional && (
                                <span className="px-2 py-0.5 rounded-full bg-clay/20 dark:bg-charcoal-light/20 text-[10px] text-charcoal-light dark:text-stone-400 font-bold uppercase tracking-wider">
                                    Optional
                                </span>
                            )}
                        </div>
                        <h3 className={`text-xl font-serif font-bold ${step.optional ? 'text-charcoal/80 dark:text-stone-100/80 italic' : 'text-charcoal dark:text-stone-100'}`}>
                            {step.title}
                        </h3>
                    </div>
                </div>

                {step.description && (
                    <p className="text-charcoal-light dark:text-stone-400 mb-4 leading-relaxed">
                        {step.description}
                    </p>
                )}

                {/* Substeps */}
                {step.subSteps && step.subSteps.length > 0 && (
                    <div className="mb-6 pl-4 border-l-2 border-clay/10 dark:border-charcoal-light/10 space-y-4">
                        {step.subSteps.map((subStep, i) => (
                            <div key={i} className="relative">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-terra/50"></div>
                                    <h5 className="font-bold text-charcoal dark:text-stone-200">{subStep.title}</h5>
                                </div>
                                {subStep.description && (
                                    <p className="text-sm text-charcoal-light dark:text-stone-400 pl-4">{subStep.description}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Places */}
                {step.places && step.places.length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-light dark:text-stone-500 mb-2">Locations</h4>
                        <div className="flex flex-wrap gap-2">
                            {step.places.map((place, i) => (
                                <a
                                    key={i}
                                    href={`/provinces/${place.spec.location.province.replace('province/', '')}/${place.spec.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-clay/10 dark:bg-charcoal-light/10 rounded-lg text-xs font-bold text-terra hover:bg-terra hover:text-white transition-colors"
                                >
                                    <MapPin size={12} />
                                    {place.spec.name}
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* People */}
                {step.people && step.people.length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-light dark:text-stone-500 mb-2">People</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {step.people.map((person, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-clay/10 dark:border-charcoal-light/20 bg-clay/5 dark:bg-charcoal-light/5">
                                    <div className="w-8 h-8 rounded-full bg-terra/10 flex items-center justify-center text-terra">
                                        <User size={16} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-charcoal dark:text-stone-100">
                                            {person.details?.spec.name || person.id}
                                        </div>
                                        <div className="text-xs text-charcoal-light dark:text-stone-400">
                                            {person.role}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Transport */}
                {step.transportToNext && (
                    <div className="mt-4 pt-4 border-t border-clay/10 dark:border-charcoal-light/20 text-sm text-charcoal-light dark:text-stone-400">
                        <div className="flex items-center gap-3">
                            {(() => {
                                const mode = step.transportToNext.mode;
                                switch (mode) {
                                    case 'Walking': return <Footprints size={16} className="text-terra" />;
                                    case 'Taxi':
                                    case 'Shared Taxi': return <Car size={16} className="text-terra" />;
                                    case 'Bus':
                                    case 'Mini Bus': return <Bus size={16} className="text-terra" />;
                                    case 'Plane': return <Plane size={16} className="text-terra" />;
                                    case 'Train': return <Train size={16} className="text-terra" />;
                                    case 'Mule': return <PawPrint size={16} className="text-terra" />;
                                    default: return <Navigation size={16} className="text-terra" />;
                                }
                            })()}
                            <div>
                                <span className="font-bold text-charcoal dark:text-stone-200 capitalize">{step.transportToNext.mode}</span>
                                <span className="mx-1">•</span>
                                <span className="font-medium">{step.transportToNext.durationMin} min</span>
                            </div>
                        </div>
                        {step.transportToNext.advice && (
                            <p className="text-xs mt-1 italic opacity-80 pl-7">{step.transportToNext.advice}</p>
                        )}
                    </div>
                )}


            </div>
        </div>
    );
};

export default function PlanView({ plan, children }: Props) {
    const [isMobile, setIsMobile] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Initialize state from URL if available
    const [activeStepIndex, setActiveStepIndex] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const step = parseInt(params.get('step') || '0', 10);
            return isNaN(step) ? 0 : step;
        }
        return 0;
    });

    const [isTourActive, setIsTourActive] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('mode') === 'tour';
        }
        return false;
    });

    const mapRef = useRef<MapRef>(null);
    const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

    const scrollToStep = (index: number) => {
        if (!isMobile) {
            stepRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setActiveStepIndex(index);
    };

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Sync State to URL
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);

        // Only update if changed to avoid unnecessary replaceState calls
        const currentStep = parseInt(params.get('step') || '0', 10);
        const currentMode = params.get('mode');

        let shouldUpdate = false;

        if (currentStep !== activeStepIndex) {
            params.set('step', activeStepIndex.toString());
            shouldUpdate = true;
        }

        if (isTourActive) {
            if (currentMode !== 'tour') {
                params.set('mode', 'tour');
                shouldUpdate = true;
            }
        } else {
            if (currentMode === 'tour') {
                params.delete('mode');
                shouldUpdate = true;
            }
        }

        if (shouldUpdate) {
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
        }

    }, [activeStepIndex, isTourActive]);

    const steps = plan.spec.steps;

    // Collect all points for initial bounds
    const allPoints = steps.flatMap(s => s.places || []).map(p => ({
        longitude: p.spec.location.longitude,
        latitude: p.spec.location.latitude
    }));

    const fitMapToAll = () => {
        if (!mapRef.current || allPoints.length === 0) return;
        const bounds = new maplibregl.LngLatBounds();
        allPoints.forEach(p => bounds.extend([p.longitude, p.latitude]));
        mapRef.current.fitBounds(bounds, {
            padding: isMobile ? { top: 50, bottom: 250, left: 50, right: 50 } : 100,
            duration: 1500
        });
    };

    // Initial Map Load
    const onMapLoad = (e: maplibregl.MapLibreEvent) => {
        fitMapToAll();
    };

    // Effect to handle map movement
    useEffect(() => {
        if (!mapRef.current) return;

        if (isMobile && !isTourActive) {
            // In overview mode on mobile, always show full map
            fitMapToAll();
            return;
        }

        const activeStep = steps[activeStepIndex];
        if (activeStep && activeStep.places && activeStep.places.length > 0) {
            const places = activeStep.places;

            // Mobile padding (push up from bottom sheet)
            const mobilePadding = { top: 50, bottom: 300, left: 20, right: 20 };
            const desktopPadding = 100;

            if (places.length === 1) {
                mapRef.current.flyTo({
                    center: [places[0].spec.location.longitude, places[0].spec.location.latitude],
                    zoom: 16,
                    padding: isMobile ? mobilePadding : desktopPadding,
                    duration: 1500
                });
            } else {
                const bounds = new maplibregl.LngLatBounds();
                places.forEach(p => bounds.extend([p.spec.location.longitude, p.spec.location.latitude]));
                mapRef.current.fitBounds(bounds, {
                    padding: isMobile ? mobilePadding : desktopPadding,
                    maxZoom: 16,
                    duration: 1500
                });
            }
        }
    }, [activeStepIndex, isMobile, isTourActive]);


    // --- Mobile Bottom Sheet Content ---
    const renderMobileContent = () => {
        if (!isTourActive) {
            // OVERVIEW MODE
            return (
                <div className="space-y-6">
                    {/* Header */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full bg-terra/10 text-[10px] font-bold uppercase text-terra tracking-wider">
                                {plan.kind.split('/').pop()?.replace('-', ' ')}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-charcoal-light dark:text-stone-400 font-medium">
                                <Clock size={12} />
                                <span>{plan.spec.estimatedDuration.value} {plan.spec.estimatedDuration.unit}</span>
                            </div>
                        </div>
                        <h2 className="text-2xl font-serif font-bold text-charcoal dark:text-stone-100 leading-tight mb-2">
                            {plan.spec.title}
                        </h2>
                        <a href="/plans" className="text-xs font-bold text-terra hover:underline flex items-center gap-1">
                            <ChevronLeft size={12} />
                            Back to All Plans
                        </a>
                    </div>

                    {/* Start Action */}
                    <button
                        onClick={() => {
                            setIsTourActive(true);
                            setActiveStepIndex(0);
                            setIsSheetOpen(false); // Collapse to peek view for active step
                        }}
                        className="w-full py-3 bg-terra text-white font-bold rounded-xl shadow-lg shadow-terra/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                        <Play size={18} fill="currentColor" />
                        Start Guided Tour
                    </button>

                    {/* Timeline List */}
                    <div className="space-y-4 pt-4 border-t border-clay/10 dark:border-charcoal-light/10">
                        <h3 className="text-sm font-bold text-charcoal dark:text-stone-100 uppercase tracking-wider">Itinerary</h3>
                        <div className="space-y-4 relative pl-4">
                            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-clay/20 dark:bg-charcoal-light/20"></div>
                            {steps.map((step, idx) => (
                                <div key={idx} className="relative flex items-center gap-4 group cursor-pointer" onClick={() => { setActiveStepIndex(idx); setIsTourActive(true); setIsSheetOpen(false); }}>
                                    <div className="w-6 h-6 rounded-full bg-white dark:bg-charcoal border-2 border-terra text-terra flex items-center justify-center text-[10px] font-bold z-10 shrink-0 shadow-sm group-hover:bg-terra group-hover:text-white transition-colors">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-charcoal dark:text-stone-200 text-sm truncate">{step.title}</h4>
                                        <div className="flex items-center gap-2 text-xs text-charcoal-light dark:text-stone-400">
                                            <span className="capitalize">{step.type}</span>
                                            {step.places && (
                                                <>
                                                    <span>•</span>
                                                    <span>{step.places.length} stops</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-clay/50" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )
        } else {
            // ACTIVE TOUR MODE
            const step = steps[activeStepIndex];
            const isLast = activeStepIndex === steps.length - 1;

            return (
                <div className="space-y-0">
                    {/* Header / Nav Controls */}
                    <div className="flex items-center justify-between pb-4 min-h-[85px]">
                        <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-terra text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    Step {activeStepIndex + 1}/{steps.length}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-charcoal-light dark:text-stone-400 tracking-wider">
                                    {step.type}
                                </span>
                            </div>
                            <h3 className="text-lg font-serif font-bold text-charcoal dark:text-stone-100 leading-tight line-clamp-2">
                                {step.title}
                            </h3>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                disabled={activeStepIndex === 0}
                                onClick={() => setActiveStepIndex(prev => Math.max(0, prev - 1))}
                                className="p-2 rounded-full bg-clay/10 dark:bg-charcoal-light/10 text-charcoal disabled:opacity-30 disabled:cursor-not-allowed hover:bg-clay/20"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={() => {
                                    if (isLast) {
                                        // Finish
                                        setIsTourActive(false);
                                    } else {
                                        setActiveStepIndex(prev => Math.min(steps.length - 1, prev + 1));
                                    }
                                }}
                                className={`p-2 rounded-full text-white shadow-md hover:brightness-110 active:scale-95 transition-all
                                    ${isLast ? 'bg-green-600' : 'bg-terra'}`}
                            >
                                {isLast ? <CheckCircle2 size={20} /> : <ChevronRight size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Expanded Content */}
                    <div className="space-y-6 pt-2 border-t border-clay/10 dark:border-charcoal-light/10">
                        {/* Description */}
                        <MarkdownRenderer content={step.description || ''} className="text-sm text-charcoal dark:text-stone-300" />

                        {/* Substeps */}
                        {step.subSteps && step.subSteps.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-light dark:text-stone-500">Activities</h4>
                                <div className="space-y-3 pl-2 border-l-2 border-clay/20 dark:border-charcoal-light/20 ml-1">
                                    {step.subSteps.map((sub, i) => (
                                        <div key={i} className="pl-4 relative">
                                            <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-terra"></div>
                                            <h5 className="text-sm font-bold text-charcoal dark:text-stone-200">{sub.title}</h5>
                                            {sub.description && (
                                                <p className="text-xs text-charcoal-light dark:text-stone-400 mt-1">{sub.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* People */}
                        {step.people && step.people.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-light dark:text-stone-500">Key Figures</h4>
                                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 custom-scrollbar">
                                    {step.people.map((person, i) => (
                                        <div key={i} className="flex-shrink-0 flex items-center gap-3 p-2 pr-4 rounded-full border border-clay/10 dark:border-charcoal-light/20 bg-clay/5 dark:bg-charcoal-light/5">
                                            <div className="w-8 h-8 rounded-full bg-terra/10 flex items-center justify-center text-terra">
                                                <User size={16} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-charcoal dark:text-stone-100 whitespace-nowrap">
                                                    {person.details?.spec.name || person.id}
                                                </div>
                                                <div className="text-[10px] text-charcoal-light dark:text-stone-400">
                                                    {person.role}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Places Links */}
                        {step.places && step.places.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-light">Locations</h4>
                                {step.places.map((place, i) => (
                                    <div key={i} className="flex gap-2">
                                        {/* Main Link to Internal Page */}
                                        <a
                                            href={`/provinces/${place.spec.location.province.replace('province/', '')}/${place.spec.id}`}
                                            className="flex-1 flex items-center gap-3 p-3 bg-clay/5 dark:bg-charcoal-light/5 rounded-xl border border-clay/10 active:bg-clay/10 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-white dark:bg-charcoal border border-clay/20 flex items-center justify-center shrink-0">
                                                <MapPin size={16} className="text-terra" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm text-charcoal dark:text-stone-200">{place.spec.name}</div>
                                                <div className="text-xs text-charcoal-light">View Details</div>
                                            </div>
                                            <ChevronRight size={16} className="text-clay/50" />
                                        </a>

                                        {/* Google Maps Deep Link */}
                                        <a
                                            href={`https://www.google.com/maps/dir//${place.spec.location.latitude},${place.spec.location.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-12 flex items-center justify-center bg-terra/10 rounded-xl text-terra active:bg-terra/20"
                                        >
                                            <Navigation size={20} />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Transport */}
                        {step.transportToNext && (
                            <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-terra/5 to-clay/5 border border-terra/10 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-charcoal flex items-center justify-center text-terra shadow-sm">
                                    {(() => {
                                        const mode = step.transportToNext.mode;
                                        switch (mode) {
                                            case 'Walking': return <Footprints size={20} />;
                                            case 'Taxi':
                                            case 'Shared Taxi': return <Car size={20} />;
                                            case 'Bus':
                                            case 'Mini Bus': return <Bus size={20} />;
                                            case 'Plane': return <Plane size={20} />;
                                            case 'Train': return <Train size={20} />;
                                            case 'Mule': return <PawPrint size={20} />;
                                            default: return <Navigation size={20} />;
                                        }
                                    })()}
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase text-charcoal-light dark:text-stone-400 tracking-wider mb-0.5">Next Stop</div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-charcoal dark:text-stone-100">{step.transportToNext.durationMin} min</span>
                                        <span className="text-sm text-charcoal dark:text-stone-300 capitalize">{step.transportToNext.mode}</span>
                                    </div>
                                    {step.transportToNext.advice && (
                                        <div className="text-xs text-charcoal-light dark:text-stone-400 mt-1 italic leading-tight">
                                            "{step.transportToNext.advice}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setIsTourActive(false)}
                            className="w-full py-3 text-xs font-bold text-charcoal-light hover:text-terra uppercase tracking-wider"
                        >
                            Exit Tour
                        </button>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden">

            {/* --- DESKTOP VIEW (Unchanged) --- */}
            {/* Left Column: Content */}
            <div className="hidden lg:block w-full lg:w-1/2 h-full overflow-y-auto p-4 lg:p-8 xl:p-12 order-2 lg:order-1 custom-scrollbar">
                <div className="max-w-xl mx-auto pb-24 pt-8">
                    <a href="/plans" className="inline-flex items-center gap-2 text-sm font-bold text-terra hover:underline mb-8">
                        <ChevronDown className="rotate-90" size={16} />
                        Back to Plans
                    </a>

                    <header className="mb-12">
                        <div className="flex items-center gap-2 text-terra mb-4">
                            <span className="px-3 py-1 rounded-full bg-terra/10 text-xs font-bold uppercase tracking-wider">
                                {plan.kind.split('/').pop()?.replace('-', ' ')}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal dark:text-stone-100 mb-6 leading-tight">
                            {plan.spec.title || steps[0]?.title || 'Plan Details'}
                        </h1>

                        <div className="flex flex-wrap gap-6 text-charcoal-light dark:text-stone-400">
                            <div className="flex items-center gap-2">
                                <Clock size={20} className="text-terra" />
                                <span className="font-medium">{plan.spec.estimatedDuration.value} {plan.spec.estimatedDuration.unit}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mountain size={20} className="text-terra" />
                                <span className="font-medium capitalize">{plan.spec.difficulty} Difficulty</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin size={20} className="text-terra" />
                                <span className="font-medium">{steps.length} Stops</span>
                            </div>
                        </div>
                    </header>

                    {/* Editorial Content */}
                    {children}

                    <div className="space-y-4">
                        {steps.map((step, index) => (
                            <div key={index} ref={el => { stepRefs.current[index] = el; }}>
                                <StepCard
                                    step={step}
                                    index={index}
                                    isActive={index === activeStepIndex}
                                    onInView={(inView) => {
                                        if (inView) setActiveStepIndex(index);
                                    }}
                                    onClick={() => scrollToStep(index)}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 p-8 bg-terra/5 rounded-2xl border border-terra/10 text-center">
                        <h3 className="text-xl font-serif font-bold text-charcoal dark:text-stone-100 mb-2">End of Itinerary</h3>
                        <p className="text-charcoal-light dark:text-stone-400">
                            Have you completed this journey? Share your experience!
                        </p>
                    </div>
                </div>
            </div>

            {/* --- MOBILE VIEW COMPONENTS --- */}
            {/* Render Bottom Sheet only on Mobile */}
            {isMobile && (
                <div className="lg:hidden">
                    <MapBottomSheet
                        isOpen={isSheetOpen}
                        onToggle={setIsSheetOpen}
                        peekHeight={isTourActive ? '120px' : '200px'} // Taller peek for Overview to show title + start button
                        expandedHeight="80%"
                        className="dark:bg-charcoal"
                    >
                        {renderMobileContent()}
                    </MapBottomSheet>
                </div>
            )}

            {/* --- MAP (Shared but styled diff) --- */}
            {/* Right Column (Desktop) / Full Screen (Mobile) */}
            <div className={`
                w-full lg:w-1/2 h-full
                order-1 lg:order-2 bg-clay/10 relative
            `}>
                <Map
                    ref={mapRef}
                    onLoad={onMapLoad}
                    initialViewState={{
                        longitude: allPoints[0]?.longitude || -7.61,
                        latitude: allPoints[0]?.latitude || 33.59,
                        zoom: 10
                    }}
                    mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
                    style={{ width: '100%', height: '100%' }}
                >
                    <NavigationControl position="top-right" style={isMobile ? { marginTop: '100px' } : {}} />

                    {/* Back Button for Mobile Map (since full screen) */}
                    {isMobile && (
                        <a
                            href="/plans"
                            className="absolute top-4 left-4 z-20 p-2 bg-white dark:bg-charcoal rounded-full shadow-md text-charcoal-light"
                        >
                            <ChevronLeft size={24} />
                        </a>
                    )}

                    {steps.flatMap((step, stepIndex) =>
                        (step.places || []).map((place, placeIndex) => (
                            <Marker
                                key={`${stepIndex}-${placeIndex}`}
                                longitude={place.spec.location.longitude}
                                latitude={place.spec.location.latitude}
                                anchor="bottom"
                                onClick={(e) => {
                                    e.originalEvent.stopPropagation();
                                    setActiveStepIndex(stepIndex);
                                    if (isMobile) {
                                        setIsTourActive(true);
                                        setIsSheetOpen(false);
                                    } else {
                                        scrollToStep(stepIndex);
                                    }
                                }}
                            >
                                <div className={`cursor-pointer transition-all duration-500 ${activeStepIndex === stepIndex ? 'scale-125 z-10' : 'scale-100 opacity-70 hover:opacity-100'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-md
                                        ${activeStepIndex === stepIndex
                                            ? 'bg-terra border-white text-white'
                                            : 'bg-white text-terra border-terra'}`}>
                                        <span className="text-xs font-bold">{stepIndex + 1}</span>
                                    </div>
                                    {activeStepIndex === stepIndex && (
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-terra"></div>
                                    )}
                                </div>
                            </Marker>
                        ))
                    )}
                </Map>
            </div>
        </div>
    );
}

const ExternalLinkWrapper = () => (
    <ChevronRight size={16} className="text-clay/50 group-hover:text-terra transition-colors" />
);
