import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
  Pin,
  InfoWindow
} from '@vis.gl/react-google-maps';
import { Search, Edit3, MapPin } from 'lucide-react';
import type { Place } from '../data/schema';
import { loadProvinces } from '../utils/geo';

interface Props {
  onPointSelect: (lat: number, lng: number, name?: string, altitude?: number, mapUrl?: string) => void;
  selectedPoint?: { lat: number, lng: number };
  addedPlaces: Place[];
  onPlaceClick?: (index: number) => void;
}

interface MapClickEvent extends google.maps.MapMouseEvent {
  detail?: {
    placeId?: string;
    latLng: {
      lat: number;
      lng: number;
    };
  };
}

const getCategoryColor = (kind: string) => {
  if (kind.startsWith('nature/')) return '#059669'; // Emerald 600
  if (kind.startsWith('history/')) return '#A87C6D'; // Terra
  if (kind.startsWith('religion/')) return '#7c3aed'; // Violet 600
  if (kind.startsWith('food/') || kind.startsWith('leisure/')) return '#d97706'; // Amber 600
  if (kind.startsWith('urban/') || kind.startsWith('public-space/')) return '#4b5563'; // Gray 600
  if (kind.startsWith('architecture/')) return '#0891b2'; // Cyan 600
  return '#2563eb'; // Blue 600 default
};

export const MapComponent: React.FC<Props> = ({ 
  onPointSelect, 
  selectedPoint, 
  addedPlaces,
  onPlaceClick 
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const [searchInput, setSearchInput] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [infoWindowData, setInfoWindowData] = useState<{ index: number, place: Place } | null>(null);
  const [provinces, setProvinces] = useState<object | null>(null);

  // Load provinces for boundaries
  useEffect(() => {
    loadProvinces().then(data => setProvinces(data));
  }, []);

  // Set up Data layer for provinces
  useEffect(() => {
    if (!map || !provinces) return;

    map.data.addGeoJson(provinces as object);
    map.data.setStyle({
      fillColor: '#A87C6D',
      fillOpacity: 0.03,
      strokeColor: '#A87C6D',
      strokeWeight: 1,
      strokeOpacity: 0.2,
      clickable: false
    });

    return () => {
      map.data.forEach(feature => map.data.remove(feature));
    };
  }, [map, provinces]);

  const fetchAltitudeAndSelect = useCallback(async (lat: number, lng: number, name?: string, mapUrl?: string) => {
    let altitude: number | undefined;
    
    // Fetch Elevation
    try {
      const elevator = new google.maps.ElevationService();
      const response = await elevator.getElevationForLocations({
        locations: [{ lat, lng }]
      });
      if (response.results && response.results.length > 0) {
        altitude = Math.round(response.results[0].elevation);
      }
    } catch (e) {
      console.warn('Elevation service failed:', e);
    }

    onPointSelect(lat, lng, name, altitude, mapUrl);
  }, [onPointSelect]);

  // Initialize Autocomplete
  useEffect(() => {
    if (!placesLib || !searchInputRef.current || !map) return;

    const autocomplete = new placesLib.Autocomplete(searchInputRef.current, {
      fields: ['geometry', 'name', 'formatted_address', 'url'],
      componentRestrictions: { country: 'ma' },
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        map.panTo({ lat, lng });
        map.setZoom(17);
        fetchAltitudeAndSelect(lat, lng, place.name || '', place.url);
      }
    });
  }, [placesLib, map, fetchAltitudeAndSelect]);

  const onMapClick = useCallback((ev: MapClickEvent) => {
    const lat = ev.detail?.latLng?.lat || ev.latLng?.lat() || 0;
    const lng = ev.detail?.latLng?.lng || ev.latLng?.lng() || 0;
    
    setInfoWindowData(null);

    if (ev.detail?.placeId && placesLib && map) {
      ev.stop();
      const service = new placesLib.PlacesService(map);
      service.getDetails({
        placeId: ev.detail.placeId,
        fields: ['name', 'geometry', 'url']
      }, (place, status) => {
        if (status === placesLib.PlacesServiceStatus.OK && place && place.name) {
          fetchAltitudeAndSelect(lat, lng, place.name, place.url);
        } else {
          fetchAltitudeAndSelect(lat, lng);
        }
      });
    } else {
      fetchAltitudeAndSelect(lat, lng);
    }
  }, [placesLib, map, fetchAltitudeAndSelect]);

  return (
    <div className="relative w-full h-full">
      {/* Search Overlay */}
      <div className="absolute top-4 left-4 z-10 w-96 flex items-center bg-white dark:bg-stone-900 rounded-full shadow-2xl border border-clay dark:border-stone-800 px-4 py-2">
        <Search className="text-stone-400 mr-2" size={20} />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search or click a marker..."
          className="bg-transparent outline-none w-full text-sm py-1 dark:text-stone-200"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <Map
        defaultCenter={{ lat: 31.6295, lng: -7.9811 }} // Marrakesh
        defaultZoom={6}
        mapId="MRRAKC_MAP_BUILDER"
        onClick={onMapClick}
        disableDefaultUI={true}
        zoomControl={true}
        className="w-full h-full"
      >
        {addedPlaces.map((place, index) => (
          <AdvancedMarker 
            key={`${place.spec.id}-${index}`}
            position={{ 
              lat: place.spec.location.latitude, 
              lng: place.spec.location.longitude 
            }}
            onClick={() => setInfoWindowData({ index, place })}
          >
            <Pin 
              background={getCategoryColor(place.kind)} 
              glyphColor={'#FFF'} 
              borderColor={'rgba(0,0,0,0.1)'} 
            />
          </AdvancedMarker>
        ))}

        {infoWindowData && (
          <InfoWindow
            position={{ 
              lat: infoWindowData.place.spec.location.latitude, 
              lng: infoWindowData.place.spec.location.longitude 
            }}
            onCloseClick={() => setInfoWindowData(null)}
          >
            <div className="p-1 min-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md" style={{ backgroundColor: `${getCategoryColor(infoWindowData.place.kind)}22`, color: getCategoryColor(infoWindowData.place.kind) }}>
                  <MapPin size={14} />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">{infoWindowData.place.spec.name}</h3>
                  <p className="text-[10px] text-stone-500 uppercase font-medium tracking-wider">{infoWindowData.place.spec.location.province}</p>
                </div>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 mb-3 line-clamp-2">{infoWindowData.place.spec.description}</p>
              <button 
                onClick={() => {
                  onPlaceClick?.(infoWindowData.index);
                  setInfoWindowData(null);
                }}
                className="w-full flex items-center justify-center gap-2 py-1.5 bg-terra hover:bg-terra-dark text-white text-xs font-bold rounded-md transition-colors"
              >
                <Edit3 size={12} /> Edit Place
              </button>
            </div>
          </InfoWindow>
        )}

        {selectedPoint && (
          <AdvancedMarker position={selectedPoint} />
        )}
      </Map>
    </div>
  );
};
