import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre';
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
    PawPrint
} from 'lucide-react';

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

const StepCard = ({ step, index, isActive, onInView, onClick }: { step: Step; index: number; isActive: boolean; onInView: (inView: boolean) => void, onClick: () => void }) => {
    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: '-45% 0px -45% 0px',
        onChange: (inView) => onInView(inView),
    });

    return (
        <div
            ref={ref}
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
                                <span>{step.transportToNext.durationMin} min</span>
                            </div>
                        </div>
                        {step.transportToNext.advice && (
                            <p className="text-xs mt-1 italic opacity-80 pl-7">{step.transportToNext.advice}</p>
                        )}
                    </div>
                )}

                {/* Substeps */}
                {step.subSteps && step.subSteps.length > 0 && (
                    <div className="mt-6 pl-4 border-l-2 border-clay/10 dark:border-charcoal-light/10 space-y-4">
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
            </div>
        </div>
    );
};

export default function PlanView({ plan, children }: Props) {
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const mapRef = useRef<MapRef>(null);
    const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

    const scrollToStep = (index: number) => {
        stepRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setActiveStepIndex(index);
    };

    // Flatten steps for linear navigation if needed, but for now we just iterate top-level
    // If we want to support nested steps in the map, we need to flatten.
    // Let's stick to top-level steps for the main timeline for simplicity, 
    // or flatten if subSteps have places.
    // The dummy data has subSteps without places (just activities), so top-level is fine.

    const steps = plan.spec.steps;

    // Collect all points for initial bounds
    const allPoints = steps.flatMap(s => s.places || []).map(p => ({
        longitude: p.spec.location.longitude,
        latitude: p.spec.location.latitude
    }));

    useEffect(() => {
        if (allPoints.length > 0 && mapRef.current) {
            const bounds = new maplibregl.LngLatBounds();
            allPoints.forEach(p => bounds.extend([p.longitude, p.latitude]));
            mapRef.current.fitBounds(bounds, { padding: 100, duration: 1000 });
        }
    }, []);

    useEffect(() => {
        const activeStep = steps[activeStepIndex];
        if (activeStep && activeStep.places && activeStep.places.length > 0 && mapRef.current) {
            const places = activeStep.places;
            if (places.length === 1) {
                mapRef.current.flyTo({
                    center: [places[0].spec.location.longitude, places[0].spec.location.latitude],
                    zoom: 14,
                    duration: 1500
                });
            } else {
                const bounds = new maplibregl.LngLatBounds();
                places.forEach(p => bounds.extend([p.spec.location.longitude, p.spec.location.latitude]));
                mapRef.current.fitBounds(bounds, { padding: 100, maxZoom: 14, duration: 1500 });
            }
        }
    }, [activeStepIndex]);

    return (
        <div className="flex flex-col lg:flex-row min-h-screen">
            {/* Left Column: Content */}
            <div className="w-full lg:w-1/2 p-4 lg:p-8 xl:p-12 order-2 lg:order-1">
                <div className="max-w-xl mx-auto">
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
                            {steps[0]?.title || 'Plan Details'}
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

            {/* Right Column: Map */}
            <div className="w-full lg:w-1/2 h-[40vh] lg:h-screen sticky top-0 order-1 lg:order-2 bg-clay/10">
                <Map
                    ref={mapRef}
                    initialViewState={{
                        longitude: -7.61,
                        latitude: 33.59,
                        zoom: 10
                    }}
                    mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
                    style={{ width: '100%', height: '100%' }}
                >
                    <NavigationControl position="top-right" />

                    {steps.flatMap((step, stepIndex) =>
                        (step.places || []).map((place, placeIndex) => (
                            <Marker
                                key={`${stepIndex}-${placeIndex}`}
                                longitude={place.spec.location.longitude}
                                latitude={place.spec.location.latitude}
                                anchor="bottom"
                                onClick={(e) => {
                                    e.originalEvent.stopPropagation();
                                    scrollToStep(stepIndex);
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
