import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
  Pin,
  InfoWindow
} from '@vis.gl/react-google-maps';
import type { MapMouseEvent } from '@vis.gl/react-google-maps';
import { Search, Edit3, MapPin, Layers, Globe, Map as MapIconIcon, Navigation } from 'lucide-react';
import type { Place } from '../data/schema';
import { loadProvinces } from '../utils/geo';

interface Props {
  onPointSelect: (lat: number, lng: number, name?: string, altitude?: number, mapUrl?: string) => void;
  selectedPoint?: { lat: number, lng: number };
  addedPlaces: Place[];
  onPlaceClick?: (index: number) => void;
  onMenuClick: () => void;
  isSidebarOpen: boolean;
  onError?: (message: string) => void;
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
  onPlaceClick,
  onMenuClick,
  isSidebarOpen,
  onError
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const [searchInput, setSearchInput] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [infoWindowData, setInfoWindowData] = useState<{ index: number, place: Place } | null>(null);
  const [provinces, setProvinces] = useState<object | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [showProvinces, setShowProvinces] = useState(true);

  const centerToMyLocation = useCallback((panOnly = false) => {
    if (!map) return;

    if (!navigator.geolocation) {
      onError?.('Geolocation is not supported by your browser.');
      return;
    }

    // Browsers block geolocation on non-secure origins (plain HTTP)
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      onError?.('Geolocation requires a secure (HTTPS) connection.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        map.panTo({ lat, lng });
        if (!panOnly) map.setZoom(15);
      },
      (error) => {
        let message = 'Failed to get your location.';
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Location access denied. Please enable it in your settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Location information is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          message = 'Location request timed out.';
        }
        console.warn('Geolocation failed:', error);
        onError?.(message);
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [map, onError]);

  // Load provinces for boundaries
  useEffect(() => {
    loadProvinces().then(data => setProvinces(data));
  }, []);

  // Set up Data layer for provinces
  useEffect(() => {
    if (!map || !provinces) return;

    if (showProvinces) {
      map.data.addGeoJson(provinces as object);
      map.data.setStyle({
        fillColor: '#A87C6D',
        fillOpacity: mapType === 'satellite' || mapType === 'hybrid' ? 0.1 : 0.03,
        strokeColor: '#A87C6D',
        strokeWeight: 1,
        strokeOpacity: 0.4,
        clickable: false
      });
    } else {
      map.data.forEach(feature => map.data.remove(feature));
    }

    return () => {
      map.data.forEach(feature => map.data.remove(feature));
    };
  }, [map, provinces, showProvinces, mapType]);

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

  const onMapClick = useCallback((ev: MapMouseEvent) => {
    if (!ev.detail.latLng) return;
    
    const lat = ev.detail.latLng.lat;
    const lng = ev.detail.latLng.lng;
    
    setInfoWindowData(null);

    if (ev.detail.placeId && placesLib && map) {
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
      {/* Search & Top Controls Overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col md:flex-row md:justify-between items-start md:items-center gap-3 pointer-events-none">
        
        {/* Search Bar + Mobile Menu Button */}
        <div className="w-full md:w-auto flex items-center gap-2 pointer-events-auto">
          <div className="flex-1 md:w-[500px] flex items-center bg-white dark:bg-stone-900 h-12 md:h-auto rounded-full shadow-2xl border border-clay dark:border-stone-800 px-4">
            <Search className="text-stone-400 mr-2 shrink-0" size={20} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search or click a marker..."
              className="bg-transparent outline-none w-full text-sm py-2 dark:text-stone-200"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          
          {/* Mobile Menu Button: Right of Search bar */}
          {!isSidebarOpen && (
            <button 
              onClick={onMenuClick}
              className="md:hidden shrink-0 bg-terra text-white w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center active:scale-95 transition-all"
              title="Open Menu"
            >
              <MapIconIcon size={22} />
            </button>
          )}
        </div>

        {/* Desktop Controls + Desktop Menu Button */}
        <div className="w-full md:w-auto flex flex-col md:flex-row items-end md:items-center gap-2 pointer-events-auto">
          {/* Map Type Switcher */}
          <div className="flex flex-col md:flex-row bg-white dark:bg-stone-900 rounded-2xl md:rounded-xl shadow-xl border border-clay dark:border-stone-800 md:p-1">
            <button 
              onClick={() => setMapType('roadmap')}
              className={`w-12 h-12 md:w-auto md:h-auto md:p-2 rounded-t-2xl md:rounded-lg border-b md:border-b-0 border-clay dark:border-stone-800 transition-all flex items-center justify-center md:justify-start gap-2 text-xs font-bold ${mapType === 'roadmap' ? 'bg-terra text-white' : 'hover:bg-clay/20 text-stone-500'}`}
            >
              <MapIconIcon size={20} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Roadmap</span>
            </button>
            <button 
              onClick={() => setMapType('hybrid')}
              className={`w-12 h-12 md:w-auto md:h-auto md:p-2 rounded-b-2xl md:rounded-lg transition-all flex items-center justify-center md:justify-start gap-2 text-xs font-bold ${mapType === 'hybrid' ? 'bg-terra text-white' : 'hover:bg-clay/20 text-stone-500'}`}
            >
              <Globe size={20} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Satellite</span>
            </button>
          </div>
          
          <button 
            onClick={() => setShowProvinces(!showProvinces)}
            className={`w-12 h-12 md:w-auto md:h-auto md:px-3 md:py-2 flex items-center justify-center md:justify-start gap-2 bg-white dark:bg-stone-900 rounded-2xl md:rounded-xl shadow-xl border border-clay dark:border-stone-800 transition-all text-xs font-bold ${showProvinces ? 'text-terra' : 'text-stone-400'}`}
          >
            <Layers size={20} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">{showProvinces ? 'Hide Boundaries' : 'Show Boundaries'}</span>
          </button>

          <button 
            onClick={() => centerToMyLocation(true)}
            className="w-12 h-12 md:w-auto md:h-auto md:px-3 md:py-2 flex items-center justify-center md:justify-start gap-2 bg-white dark:bg-stone-900 rounded-2xl md:rounded-xl shadow-xl border border-clay dark:border-stone-800 transition-all text-xs font-bold text-terra hover:bg-clay/10 active:scale-95"
            title="Center to my location"
          >
            <Navigation size={20} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">My Location</span>
          </button>

          {/* Desktop Menu Button: Right of Boundaries button */}
          {!isSidebarOpen && (
            <button 
              onClick={onMenuClick}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-clay dark:border-stone-800 hover:bg-clay/10 transition-colors text-xs font-bold text-terra"
              title="Open Menu"
            >
              <MapIconIcon size={16} />
              <span>Menu</span>
            </button>
          )}
        </div>
      </div>

      <Map
        defaultCenter={{ lat: 31.6295, lng: -7.9811 }} // Marrakesh
        defaultZoom={6}
        mapId="MRRAKC_MAP_BUILDER"
        mapTypeId={mapType}
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
