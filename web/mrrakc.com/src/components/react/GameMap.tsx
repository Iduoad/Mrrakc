import React, { useRef, useEffect } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin } from 'lucide-react';

interface Point {
    latitude: number;
    longitude: number;
    label?: string;
    isCurrent?: boolean;
}

interface Props {
    points: Point[];
}

export default function GameMap({ points = [] }: Props) {
    const mapRef = useRef<MapRef>(null);

    console.log('GameMap points:', points);

    const currentPoint = points.find(p => p.isCurrent) || points[points.length - 1];

    useEffect(() => {
        if (mapRef.current && points.length > 0) {
            const bounds = new maplibregl.LngLatBounds();
            points.forEach(p => bounds.extend([p.longitude, p.latitude]));

            mapRef.current.fitBounds(bounds, {
                padding: 100,
                maxZoom: 16,
                duration: 1000
            });
        }
    }, [points]);

    return (
        <div className="w-full h-64 rounded-2xl overflow-hidden border border-clay/20 dark:border-charcoal-light shadow-sm mb-6 relative">
            <Map
                ref={mapRef}
                initialViewState={{
                    longitude: currentPoint?.longitude || -7.61,
                    latitude: currentPoint?.latitude || 33.59,
                    zoom: 13
                }}
                mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
                style={{ width: '100%', height: '100%' }}
            >
                <NavigationControl position="top-right" />
                {points.map((point, idx) => (
                    <Marker
                        key={idx}
                        longitude={point.longitude}
                        latitude={point.latitude}
                        anchor="bottom"
                    >
                        <div className={`${point.isCurrent ? 'text-terra animate-bounce' : 'text-clay-dark dark:text-stone-400'}`}>
                            <MapPin size={point.isCurrent ? 32 : 24} fill="currentColor" />
                        </div>
                    </Marker>
                ))}
            </Map>
        </div>
    );
}
