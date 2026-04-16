import React, { useState, useCallback, useRef } from 'react';
import {
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
  Pin
} from '@vis.gl/react-google-maps';
import { Search } from 'lucide-react';
import type { Place } from '../data/schema';

interface Props {
  onPointSelect: (lat: number, lng: number, name?: string, altitude?: number, mapUrl?: string) => void;
  selectedPoint?: { lat: number, lng: number };
  addedPlaces: Place[];
  onPlaceClick?: (index: number) => void;
}

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
  React.useEffect(() => {
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
        fetchAltitudeAndSelect(lat, lng, place.name, place.url);
      }
    });
  }, [placesLib, map, fetchAltitudeAndSelect]);

  const onMapClick = useCallback((ev: any) => {
    const lat = ev.detail.latLng.lat;
    const lng = ev.detail.latLng.lng;
    
    if (ev.detail.placeId && placesLib && map) {
      ev.stop();
      const service = new placesLib.PlacesService(map);
      service.getDetails({
        placeId: ev.detail.placeId,
        fields: ['name', 'geometry', 'url']
      }, (place: any, status: any) => {
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
          className="bg-transparent outline-none w-full text-sm py-1"
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
            onClick={() => onPlaceClick?.(index)}
          >
            <Pin background={'#A87C6D'} glyphColor={'#FFF'} borderColor={'#8D6658'} />
          </AdvancedMarker>
        ))}

        {selectedPoint && (
          <AdvancedMarker position={selectedPoint} />
        )}
      </Map>
    </div>
  );
};
