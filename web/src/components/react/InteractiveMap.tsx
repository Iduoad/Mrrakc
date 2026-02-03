import React, { useState, useMemo, useRef, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
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
    Utensils,
    Moon,
    Church,
    Film,
    Building,
    Building2,
    Store,
    Coffee,
    Croissant,
    School,
    University,
    Pill,
    Hospital,
    BedDouble,
    Home,
    Tent,
    ChevronLeft,
    FerrisWheel,
    Waves,
    PawPrint,
    Mountain,
    MountainSnow,
    Dam,
    Kayak,
    Castle,
    TowerControl
} from 'lucide-react';

import type { MapPoint } from '../../types/map';
import MapBottomSheet from './MapBottomSheet';
import MarkdownRenderer from './MarkdownRenderer';

interface Props {
    points: MapPoint[];
    simple?: boolean;
    className?: string;
    headerContent?: React.ReactNode;
    autoFit?: boolean;
    title?: string;
    // New prop to pass children (like chips) to overlay
    children?: React.ReactNode;
}

const getIcon = (kindString: string) => {
    // kindString is expected to be "category/kind" or just "kind"
    // We split by '/' to get parts.
    const parts = kindString.toLowerCase().split('/');
    const kind = parts.length > 1 ? parts[1] : parts[0];
    const category = parts.length > 1 ? parts[0] : '';

    // 1. Specific Kind Checks
    if (kind.includes('cinema')) return <Clapperboard size={18} />;
    if (kind.includes('gallery') || kind.includes('art') || kind.includes('museum')) return <Palette size={18} />;
    if (kind.includes('amusement')) return <FerrisWheel size={18} />;
    if (kind.includes('zoo')) return <PawPrint size={18} />;
    if (kind.includes('park') || kind.includes('garden')) return <Trees size={18} />;
    if (kind.includes('beach')) return <Waves size={18} />;
    if (kind.includes('dam')) return <Dam size={18} />;
    if (kind.includes('lake')) return <Kayak size={18} />;
    if (kind.includes('mountain')) return <MountainSnow size={18} />;
    if (kind.includes('station') || kind.includes('tram') || kind.includes('train')) return <TrainFront size={18} />;
    if (kind.includes('market') || kind.includes('souk') || kind.includes('mall')) return <ShoppingBag size={18} />;
    if (kind.includes('bakery')) return <Croissant size={18} />;
    if (kind.includes('cafe')) return <Coffee size={18} />;
    if (kind.includes('restaurant')) return <Utensils size={18} />;
    if (kind.includes('hotel') || kind.includes('riad')) return <Hotel size={18} />;
    if (kind.includes('pharmacy')) return <Pill size={18} />;
    if (kind.includes('hospital') || kind.includes('clinic')) return <Hospital size={18} />;
    if (kind.includes('school')) return <School size={18} />;
    if (kind.includes('university')) return <University size={18} />;
    if (kind.includes('stadium')) return <Trophy size={18} />;
    if (kind.includes('mosque')) return <Moon size={18} />;
    if (kind.includes('church') || kind.includes('synagogue')) return <Church size={18} />;
    if (kind.includes('gate') || kind.includes('bastion') || kind.includes('fort') || kind.includes('kasbah')) return <Castle size={18} />;
    if (kind.includes('lighthouse')) return <TowerControl size={18} />;
    if (kind.includes('building') || kind.includes('villa') || kind.includes('office')) return <Landmark size={18} />;
    if (kind.includes('square') || kind.includes('plaza')) return <Milestone size={18} />;

    // 2. Category Fallbacks
    if (category.includes('architecture')) return <Landmark size={18} />;
    if (category.includes('entertainment')) return <Film size={18} />;
    if (category.includes('culture')) return <Palette size={18} />;
    if (category.includes('nature')) return <Trees size={18} />;
    if (category.includes('transport')) return <TrainFront size={18} />;
    if (category.includes('commercial')) return <Store size={18} />;
    if (category.includes('history')) return <Landmark size={18} />;
    if (category.includes('public')) return <Milestone size={18} />;
    if (category.includes('sports')) return <Trophy size={18} />;
    if (category.includes('education')) return <GraduationCap size={18} />;
    if (category.includes('health')) return <Stethoscope size={18} />;
    if (category.includes('tourism')) return <BedDouble size={18} />;
    if (category.includes('religion')) return <Moon size={18} />;
    if (category.includes('urban')) return <Milestone size={18} />;
    if (category.includes('food')) return <Utensils size={18} />;

    // 3. Default
    return <MapPin size={18} />;
};

export default function InteractiveMap({ points, simple = false, className = '', headerContent, autoFit = false, title, children }: Props) {
    const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(!simple);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const mapRef = useRef<MapRef>(null);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Calculate bounds and fit map
    const fitMapToBounds = React.useCallback(() => {
        if (!mapRef.current || points.length === 0 || !autoFit) return;

        const bounds = new maplibregl.LngLatBounds();
        points.forEach(p => bounds.extend([p.location.longitude, p.location.latitude]));

        mapRef.current.fitBounds(bounds, {
            padding: 150,
            maxZoom: 16,
            duration: 1000
        });
    }, [points, autoFit]);

    useEffect(() => {
        fitMapToBounds();
    }, [fitMapToBounds]);

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
        // To use fitBounds for a single point with padding, we create a small bounding box around it.
        const bounds: [number, number, number, number] = [
            point.location.longitude - 0.0001, // minX
            point.location.latitude - 0.0001,  // minY
            point.location.longitude + 0.0001, // maxX
            point.location.latitude + 0.0001   // maxY
        ];

        // Adjust padding for mobile to account for bottom sheet
        const isMobile = window.innerWidth < 768;
        const padding = isMobile ? { top: 50, bottom: 300, left: 50, right: 50 } : 100;

        mapRef.current?.flyTo({
            center: [point.location.longitude, point.location.latitude],
            padding: typeof padding === 'number' ? { top: padding, bottom: padding, left: padding, right: padding } : padding,
            duration: 1000
        });

        // if (isMobile) {
        //     setIsMobileSheetOpen(true);
        // }
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

    // Detail Card Render Helper
    const renderDetailCard = (point: MapPoint) => (
        <div className="space-y-0">
            <div className="flex items-start justify-between gap-3 min-h-[85px] pb-4">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-terra/10 text-terra flex items-center justify-center shrink-0">
                        {React.cloneElement(getIcon(point.category) as React.ReactElement<{ size: number }>, { size: 24 })}
                    </div>
                    <div>
                        <h3 className="font-serif font-bold text-xl text-charcoal dark:text-stone-100 leading-tight mb-1">
                            {point.name}
                        </h3>
                        <p className="text-xs uppercase tracking-wider text-charcoal-light dark:text-stone-400 font-medium">
                            {point.kind.split('/').pop()?.replace('-', ' ')}
                        </p>
                    </div>
                </div>
                {/* Close/Back Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPoint(null);
                    }}
                    className="p-2 bg-clay/10 dark:bg-charcoal-light/10 rounded-full text-charcoal-light hover:text-terra h-fit"
                    title="Back to List"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Content available on scroll/expand */}
            <div className="space-y-4 pt-2 border-t border-clay/10 dark:border-charcoal-light/10">
                <MarkdownRenderer content={point.description} className="text-sm text-charcoal dark:text-stone-300" />

                {/* Directions Link (Mobile) */}
                <a
                    href={`https://www.google.com/maps/dir//${point.location.latitude},${point.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-bold text-terra hover:underline"
                >
                    <MapPin size={14} />
                    Get Directions
                </a>

                {point.prices && point.prices.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {point.prices.map((price, idx) => (
                            <div key={idx} className="px-2 py-1 bg-clay/10 dark:bg-charcoal-light/10 rounded-md text-xs">
                                <span className="text-charcoal-light dark:text-stone-400 mr-1">{price.title}:</span>
                                <span className="font-bold text-charcoal dark:text-stone-200">
                                    {price.entranceFee === -1 ? 'Var' : (price.entranceFee ? `${price.entranceFee}` : 'Free')}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <a
                    href={`/provinces/${point.id}`}
                    className="block w-full text-center py-3 bg-terra text-white font-bold rounded-xl shadow-lg shadow-terra/20 hover:bg-terra-dark transition-all active:scale-95"
                >
                    View Full Details
                </a>
            </div>
        </div>
    );

    // List Item Render Helper
    const renderListItem = (point: MapPoint) => (
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
    );


    return (
        <>
            {/* Backdrop for modal mode */}
            {isMaximized && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setIsMaximized(false)}
                />
            )}

            <div className={`flex flex-col md:flex-row overflow-hidden md:border border-clay/50 md:shadow-xl bg-white dark:bg-charcoal transition-all duration-300 ease-in-out
                ${isMaximized
                    ? 'fixed inset-4 z-50 rounded-2xl h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]'
                    : `relative w-full md:rounded-2xl ${className || 'h-[600px]'}`
                }
            `}>
                {/* Desktop: Legend Sidebar */}
                {!simple && (
                    <div className={`hidden md:flex transition-all duration-300 ease-in-out z-20 bg-white dark:bg-charcoal flex-col border-clay/30 dark:border-charcoal-light
                    ${isSidebarOpen ? 'w-1/3 h-full opacity-100 border-r' : 'w-0 h-full opacity-0 pointer-events-none'}
                `}>
                        <div className="p-4 bg-clay/10 dark:bg-charcoal-light/10 border-b border-clay/30 dark:border-charcoal-light flex items-start justify-between gap-3">
                            <div className="flex-grow min-w-0">
                                {headerContent ? headerContent : (
                                    <>
                                        <h3 className="text-lg font-serif font-bold text-charcoal dark:text-stone-100 leading-tight">{title || 'Map Explorer'}</h3>
                                        <p className="text-xs text-charcoal-light dark:text-stone-400">{points.length} locations</p>
                                    </>
                                )}
                            </div>
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="p-2 -mr-2 -mt-1 text-charcoal-light hover:text-terra hover:bg-terra/10 rounded-full transition-all duration-200 shrink-0 h-fit"
                                title="Collapse Sidebar"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            {points.map(renderListItem)}
                        </div>
                    </div>
                )}

                {/* Desktop: Sidebar Toggle Button (Floating) */}
                {!simple && !isSidebarOpen && (
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="hidden md:block absolute top-4 left-4 z-30 p-3 bg-white dark:bg-charcoal text-terra rounded-full shadow-lg border border-clay/30 dark:border-charcoal-light hover:scale-110 transition-all duration-200 group"
                        title="Open Legend"
                    >
                        <Menu size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                )}

                {/* Maximize/Minimize Button (Floating) */}
                <button
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="absolute top-4 right-14 z-30 p-2 bg-white dark:bg-charcoal text-charcoal dark:text-stone-100 rounded-lg shadow-md border border-clay/30 dark:border-charcoal-light hover:bg-clay/10 transition-colors hidden md:flex"
                    title={isMaximized ? "Minimize Map" : "Maximize Map"}
                >
                    {isMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>

                {/* Map Area */}
                <div className={`flex-1 h-full relative bg-clay/10 transition-all duration-300`}>
                    {/* Overlay Children (Chips etc) */}
                    {children && (
                        <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none p-4">
                            <div className="pointer-events-auto">
                                {children}
                            </div>
                        </div>
                    )}

                    <Map
                        ref={mapRef}
                        onLoad={fitMapToBounds}
                        initialViewState={initialViewState}
                        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
                        style={{ width: '100%', height: '100%' }}
                        attributionControl={false}
                    >
                        {/* Only show attribution on desktop or small */}
                        {!simple && !isMobileSheetOpen && (
                            <div style={{ position: 'absolute', right: 5, bottom: 5, fontSize: 10, opacity: 0.5 }}>© MapLibre © Carto</div>
                        )}

                        <NavigationControl
                            position="top-right"
                            style={isMobile ? { marginTop: '120px' } : {}}
                        />

                        {points.map(point => (
                            <Marker
                                key={point.id}
                                longitude={point.location.longitude}
                                latitude={point.location.latitude}
                                anchor="bottom"
                                onClick={e => {
                                    e.originalEvent.stopPropagation();
                                    handleFocus(point);
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

                        {/* Desktop Popup */}
                        {selectedPoint && window.innerWidth >= 768 && (
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
                                    <div className={`not-prose flex items-center ${simple ? 'gap-2 mb-0' : 'gap-3 mb-4'}`}>
                                        <div className={`${simple ? 'w-6 h-6 rounded' : 'w-10 h-10 rounded-lg'} bg-terra/10 text-terra flex items-center justify-center shrink-0`}>
                                            {React.cloneElement(getIcon(selectedPoint.category) as React.ReactElement<{ size: number }>, { size: simple ? 14 : 18 })}
                                        </div>
                                        <h3 className={`font-serif font-bold text-charcoal dark:text-stone-100 leading-tight ${simple ? 'text-sm' : 'text-lg'}`}>
                                            <a href={`/provinces/${selectedPoint.id}`} className="hover:text-terra transition-colors">
                                                {selectedPoint.name}
                                            </a>
                                        </h3>
                                    </div>

                                    {!simple && (
                                        <>
                                            <MarkdownRenderer content={selectedPoint.description} className="text-xs text-charcoal-light dark:text-stone-400 mb-3" />

                                            {/* Directions Link (Desktop Popup) */}
                                            <a
                                                href={`https://www.google.com/maps/dir//${selectedPoint.location.latitude},${selectedPoint.location.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 text-xs font-bold text-terra hover:underline mb-2"
                                            >
                                                <MapPin size={12} />
                                                Get Directions
                                            </a>

                                            {!!selectedPoint.location.altitude && (
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-terra mb-3">
                                                    <Mountain size={12} />
                                                    <span>{selectedPoint.location.altitude} m</span>
                                                </div>
                                            )}

                                            <div className="mt-3 pt-2 border-t border-clay/30 dark:border-charcoal-light/30 flex justify-end">
                                                <a
                                                    href={`/provinces/${selectedPoint.id}`}
                                                    className="flex items-center gap-1 text-xs font-bold text-terra hover:text-terra-dark transition-colors group/link"
                                                >
                                                    View Details
                                                    <ChevronRight size={12} className="group-hover/link:translate-x-0.5 transition-transform" />
                                                </a>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </Popup>
                        )}
                    </Map>
                </div>

                {/* Mobile Bottom Sheet */}
                {!simple && (
                    <div className="md:hidden">
                        <MapBottomSheet
                            isOpen={isMobileSheetOpen}
                            onToggle={setIsMobileSheetOpen}
                            peekHeight={selectedPoint ? '120px' : '100px'} // Reduced peek height for cleaner look
                            expandedHeight="80%"
                        >
                            {selectedPoint ? (
                                renderDetailCard(selectedPoint)
                            ) : (
                                <>
                                    {/* Mobile Header in Sheet */}
                                    <div className="mb-4">
                                        <h3 className="text-lg font-serif font-bold text-charcoal dark:text-stone-100">{title || 'Locations'}</h3>
                                        <p className="text-xs text-charcoal-light">{points.length} places found</p>
                                    </div>
                                    <div className="space-y-2">
                                        {points.map(renderListItem)}
                                    </div>
                                </>
                            )}
                        </MapBottomSheet>
                    </div>
                )}


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
