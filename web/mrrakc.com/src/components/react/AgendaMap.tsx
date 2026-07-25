import { useMemo, useRef, useEffect } from 'react';
import MapGL, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { AgendaEventDTO } from '../../types/agenda';
import { TYPE_ICONS, TYPE_COLORS } from './EventModal';

interface Props {
    events: AgendaEventDTO[];
    activeEventId?: string;
    onSelect: (event: AgendaEventDTO) => void;
}

interface Pin {
    event: AgendaEventDTO;
    latitude: number;
    longitude: number;
}

/** Events falling back to the same province centroid would stack exactly on
 *  top of each other; spread co-located pins in a small circle. */
function spreadPins(events: AgendaEventDTO[]): Pin[] {
    const groups = new Map<string, AgendaEventDTO[]>();
    for (const event of events) {
        if (event.latitude === undefined || event.longitude === undefined) continue;
        const key = `${event.latitude.toFixed(3)},${event.longitude.toFixed(3)}`;
        groups.set(key, [...(groups.get(key) ?? []), event]);
    }
    const pins: Pin[] = [];
    for (const group of groups.values()) {
        if (group.length === 1) {
            pins.push({ event: group[0], latitude: group[0].latitude!, longitude: group[0].longitude! });
            continue;
        }
        const radius = 0.03;
        group.forEach((event, i) => {
            const angle = (2 * Math.PI * i) / group.length;
            pins.push({
                event,
                latitude: event.latitude! + radius * Math.sin(angle),
                longitude: event.longitude! + radius * Math.cos(angle),
            });
        });
    }
    return pins;
}

export default function AgendaMap({ events, activeEventId, onSelect }: Props) {
    const mapRef = useRef<MapRef>(null);
    const pins = useMemo(() => spreadPins(events), [events]);
    const hasProvinceLevel = events.some(e => e.locationSource === 'province');

    const fitToPins = () => {
        if (!mapRef.current || pins.length === 0) return;
        const bounds = new maplibregl.LngLatBounds();
        pins.forEach(pin => bounds.extend([pin.longitude, pin.latitude]));
        mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 9, duration: 500 });
    };

    useEffect(fitToPins, [pins]);

    return (
        <div>
            <div className="h-[70vh] rounded-2xl overflow-hidden border border-clay/20 dark:border-charcoal-light shadow-sm">
                <MapGL
                    ref={mapRef}
                    initialViewState={{ longitude: -7.5, latitude: 31.5, zoom: 4.5 }}
                    mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
                    onLoad={fitToPins}
                    style={{ width: '100%', height: '100%' }}
                >
                    <NavigationControl position="top-right" />
                    {pins.map(({ event, latitude, longitude }) => {
                        const TypeIcon = TYPE_ICONS[event.recurrence.type];
                        const selected = event.id === activeEventId;
                        const inactive = event.status !== 'active';
                        return (
                            <Marker
                                key={event.id}
                                longitude={longitude}
                                latitude={latitude}
                                anchor="bottom"
                                onClick={e => {
                                    e.originalEvent.stopPropagation();
                                    onSelect(event);
                                }}
                            >
                                <div
                                    className={`cursor-pointer transition-transform duration-200 hover:scale-110 ${selected ? 'z-10' : 'z-0'} ${inactive ? 'opacity-50 grayscale' : ''}`}
                                    title={`${event.name} — ${event.provinces.map(p => p.name).join(', ')}${event.locationSource === 'province' ? ' (province)' : ''}${inactive ? ` (${event.status})` : ''}`}
                                >
                                    <div className={`p-1.5 rounded-full border shadow-md transition-colors duration-300 ${selected
                                        ? 'bg-terra border-white text-white scale-125'
                                        : `bg-white dark:bg-charcoal border-terra ${TYPE_COLORS[event.recurrence.type]} ${event.locationSource === 'province' ? 'border-dashed' : ''}`
                                        }`}>
                                        <TypeIcon size={18} />
                                    </div>
                                    <div className="w-0.5 h-1.5 bg-terra mx-auto -mt-0.5"></div>
                                </div>
                            </Marker>
                        );
                    })}
                </MapGL>
            </div>
            {hasProvinceLevel && (
                <p className="mt-2 text-xs text-charcoal-light dark:text-stone-500">
                    Dashed pins mark events without a listed venue — they are placed at the level of their host province.
                </p>
            )}
        </div>
    );
}
