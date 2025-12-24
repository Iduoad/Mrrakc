import React, { useState, useMemo, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
    Clapperboard,
    Palette,
    Trees,
    MapPin,
    ExternalLink,
    ChevronRight,
    Ticket,
    TrainFront,
    ShoppingBag,
    Landmark,
    Milestone,
    Trophy,
    GraduationCap,
    Stethoscope,
    Hotel,
    Menu,
    X,
    Map as MapIcon,
    Maximize2,
    Minimize2,
    ChevronLeft
} from 'lucide-react';

export interface MapPoint {
    id: string;
    name: string;
    kind: string;
    category: string;
    description: string;
    location: {
        latitude: number;
        longitude: number;
    };
    prices?: {
        title: string;
        entranceFee?: number;
    }[];
    links?: {
        url: string;
        type: string;
        title: string;
    }[];
}

interface Props {
    points: MapPoint[];
}

const getIcon = (category: string) => {
    switch (category) {
        case 'film':
            return <Clapperboard size={18} />;
        case 'art':
            return <Palette size={18} />;
        case 'park':
            return <Trees size={18} />;
        case 'transport':
            return <TrainFront size={18} />;
        case 'market':
            return <ShoppingBag size={18} />;
        case 'building':
            return <Landmark size={18} />;
        case 'square':
            return <Milestone size={18} />;
        case 'stadium':
            return <Trophy size={18} />;
        case 'school':
            return <GraduationCap size={18} />;
        case 'health':
            return <Stethoscope size={18} />;
        case 'hotel':
            return <Hotel size={18} />;
        default:
            return <MapPin size={18} />;
    }
};

export default function InteractiveMap({ points }: Props) {
    const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMaximized, setIsMaximized] = useState(false);
    const mapRef = useRef<MapRef>(null);

    const initialViewState = useMemo(() => {
        if (points.length === 0) return { longitude: -7.61, latitude: 33.59, zoom: 12 };

        // Simple average for center
        const lats = points.map(p => p.location.latitude);
        const lngs = points.map(p => p.location.longitude);
        return {
            longitude: lngs.reduce((a, b) => a + b, 0) / lngs.length,
            latitude: lats.reduce((a, b) => a + b, 0) / lats.length,
            zoom: 14
        };
    }, [points]);

    const handleFocus = (point: MapPoint) => {
        setSelectedPoint(point);
        mapRef.current?.flyTo({
            center: [point.location.longitude, point.location.latitude],
            zoom: 16,
            duration: 2000
        });
        // On mobile, close sidebar when a point is selected
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    };

    // Handle escape key to close modal
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isMaximized) {
                setIsMaximized(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isMaximized]);

    return (
        <>
            {/* Backdrop for modal mode */}
            {isMaximized && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setIsMaximized(false)}
                />
            )}

            <div className={`flex flex-col md:flex-row overflow-hidden border border-clay/50 shadow-xl bg-white dark:bg-charcoal transition-all duration-300 ease-in-out
                ${isMaximized
                    ? 'fixed inset-4 z-50 rounded-2xl h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]'
                    : 'relative h-[600px] w-full rounded-2xl'
                }
            `}>
                {/* Legend Sidebar */}
                <div className={`transition-all duration-300 ease-in-out z-20 bg-white dark:bg-charcoal flex flex-col border-clay/30 dark:border-charcoal-light
                    ${isSidebarOpen ? 'w-full md:w-1/3 h-1/2 md:h-full opacity-100' : 'w-0 h-0 md:w-0 md:h-full opacity-0 pointer-events-none'}
                    ${isSidebarOpen ? 'border-b md:border-b-0 md:border-r' : ''}
                `}>
                    <div className="p-4 bg-clay/10 dark:bg-charcoal-light/10 border-b border-clay/30 dark:border-charcoal-light flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-serif font-bold text-charcoal dark:text-stone-100 leading-tight">Mohammed V Street Tour</h3>
                            <p className="text-xs text-charcoal-light dark:text-stone-400">{points.length} locations</p>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="p-2 -mr-2 -mt-1 text-charcoal-light hover:text-terra hover:bg-terra/10 rounded-full transition-all duration-200"
                            title="Collapse Sidebar"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {points.map(point => (
                            <button
                                key={point.id}
                                onClick={() => handleFocus(point)}
                                className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center justify-between group ${selectedPoint?.id === point.id
                                    ? 'bg-terra/10 border-terra/30 border shadow-sm'
                                    : 'hover:bg-clay/20 dark:hover:bg-charcoal-light/20 border border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${selectedPoint?.id === point.id ? 'bg-terra text-white' : 'bg-clay/30 dark:bg-charcoal-light/30 text-terra'
                                        }`}>
                                        {getIcon(point.category)}
                                    </div>
                                    <div className="not-prose flex flex-col justify-center min-w-0 gap-1">
                                        <h4 className="text-sm font-bold text-charcoal dark:text-stone-100 line-clamp-1 leading-tight">{point.name}</h4>
                                        <p className="text-[10px] uppercase tracking-wider text-charcoal-light dark:text-stone-400 font-medium leading-tight">
                                            {point.kind.split('/').pop()?.replace('-', ' ')}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight size={16} className={`shrink-0 transition-transform duration-200 ${selectedPoint?.id === point.id ? 'translate-x-1 text-terra' : 'text-clay-dark dark:text-charcoal-light opacity-0 group-hover:opacity-100'
                                    }`} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sidebar Toggle Button (Floating) */}
                {!isSidebarOpen && (
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="absolute top-4 left-4 z-30 p-3 bg-white dark:bg-charcoal text-terra rounded-full shadow-lg border border-clay/30 dark:border-charcoal-light hover:scale-110 transition-all duration-200 group"
                        title="Open Legend"
                    >
                        <Menu size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                )}

                {/* Maximize/Minimize Button (Floating) */}
                <button
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="absolute top-4 right-14 z-30 p-2 bg-white dark:bg-charcoal text-charcoal dark:text-stone-100 rounded-lg shadow-md border border-clay/30 dark:border-charcoal-light hover:bg-clay/10 transition-colors"
                    title={isMaximized ? "Minimize Map" : "Maximize Map"}
                >
                    {isMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>

                {/* Map Area */}
                <div className={`flex-1 h-full relative bg-clay/10 transition-all duration-300`}>
                    <Map
                        ref={mapRef}
                        initialViewState={initialViewState}
                        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
                        style={{ width: '100%', height: '100%' }}
                    >
                        <NavigationControl position="top-right" />

                        {points.map(point => (
                            <Marker
                                key={point.id}
                                longitude={point.location.longitude}
                                latitude={point.location.latitude}
                                anchor="bottom"
                                onClick={e => {
                                    e.originalEvent.stopPropagation();
                                    setSelectedPoint(point);
                                }}
                            >
                                <div className={`cursor-pointer transition-transform duration-200 hover:scale-110 ${selectedPoint?.id === point.id ? 'z-10' : 'z-0'
                                    }`}>
                                    <div className={`p-1.5 rounded-full border shadow-md transition-colors duration-300 ${selectedPoint?.id === point.id
                                        ? 'bg-terra border-white text-white scale-125'
                                        : 'bg-white dark:bg-charcoal border-terra text-terra'
                                        }`}>
                                        {getIcon(point.category)}
                                    </div>
                                    <div className="w-0.5 h-1.5 bg-terra mx-auto -mt-0.5"></div>
                                </div>
                            </Marker>
                        ))}

                        {selectedPoint && (
                            <Popup
                                longitude={selectedPoint.location.longitude}
                                latitude={selectedPoint.location.latitude}
                                anchor="top"
                                onClose={() => setSelectedPoint(null)}
                                closeButton={false}
                                className="custom-popup"
                                maxWidth="300px"
                                offset={10}
                            >
                                <div className="p-1">
                                    <div className="not-prose flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-terra/10 text-terra rounded-lg flex items-center justify-center shrink-0">
                                            {getIcon(selectedPoint.category)}
                                        </div>
                                        <h3 className="font-serif font-bold text-charcoal dark:text-stone-100 text-lg leading-tight">
                                            {selectedPoint.name}
                                        </h3>
                                    </div>

                                    <p className="text-xs text-charcoal-light dark:text-stone-400 mb-3 line-clamp-3 leading-relaxed">
                                        {selectedPoint.description}
                                    </p>

                                    {selectedPoint.prices && selectedPoint.prices.length > 0 && (
                                        <div className="mb-3 p-2 bg-clay/20 dark:bg-charcoal-light/20 rounded-lg border border-clay/30 dark:border-charcoal-light/30">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-terra mb-1.5">
                                                <Ticket size={12} />
                                                <span>Access & Prices</span>
                                            </div>
                                            <div className="space-y-1">
                                                {selectedPoint.prices.map((price, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-[11px]">
                                                        <span className="text-charcoal-light dark:text-stone-300">{price.title}</span>
                                                        <span className="font-bold text-charcoal dark:text-stone-100">
                                                            {price.entranceFee === -1 ? 'Variable Price' : (price.entranceFee ? `${price.entranceFee} MAD` : 'Free')}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {selectedPoint.links && selectedPoint.links.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-clay/30 dark:border-charcoal-light/30">
                                            {selectedPoint.links.map((link, idx) => (
                                                <a
                                                    key={idx}
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-[10px] font-bold text-terra hover:underline"
                                                >
                                                    <ExternalLink size={10} />
                                                    {link.title}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        )}
                    </Map>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
            .custom-popup .maplibregl-popup-content {
              padding: 12px;
              border-radius: 16px;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
              border: 1px solid rgba(0, 0, 0, 0.05);
              background: white;
            }
            .dark .custom-popup .maplibregl-popup-content {
              background: #1a1a1a;
              border-color: rgba(255, 255, 255, 0.1);
            }
            .custom-popup .maplibregl-popup-tip {
              border-bottom-color: white;
            }
            .dark .custom-popup .maplibregl-popup-tip {
              border-bottom-color: #1a1a1a;
            }
            .custom-scrollbar::-webkit-scrollbar {
              width: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(196, 77, 44, 0.2);
              border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(196, 77, 44, 0.4);
            }
          `}} />
            </div>
        </>
    );
}
