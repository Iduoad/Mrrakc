import React, { useState, useEffect, useCallback } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { MapComponent } from './components/MapComponent';
import PlaceForm from './components/PlaceForm';
import { loadProvinces, getProvinceForPoint } from './utils/geo';
import { exportToZip } from './utils/export';
import type { Place } from './data/schema';
import { Download, Trash2, Map as MapIcon, Edit3, X, MapPin } from 'lucide-react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const App: React.FC = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<{ 
    lat: number; 
    lng: number; 
    name?: string; 
    altitude?: number; 
    mapUrl?: string; 
  } | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacesListOpen, setPlacesListOpen] = useState(false);
  const [accessCode, setAccessCode] = useState(() => localStorage.getItem('mrrakc-builder-access-code') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load persistence and geo data
  useEffect(() => {
    localStorage.setItem('mrrakc-builder-access-code', accessCode);
  }, [accessCode]);

  useEffect(() => {
    const saved = localStorage.getItem('mrrakc-builder-places');
    if (saved) setPlaces(JSON.parse(saved));
    
    loadProvinces().then(() => setIsLoading(false));
  }, []);

  // Save persistence
  useEffect(() => {
    localStorage.setItem('mrrakc-builder-places', JSON.stringify(places));
  }, [places]);

  const onPointSelect = useCallback((lat: number, lng: number, name?: string, altitude?: number, mapUrl?: string) => {
    setSelectedPoint({ lat, lng, name, altitude, mapUrl });
    setEditingIndex(null); 
    setSidebarOpen(true);
  }, []);

  const onSavePlace = (place: Place) => {
    if (editingIndex !== null) {
      const newPlaces = [...places];
      newPlaces[editingIndex] = place;
      setPlaces(newPlaces);
    } else {
      setPlaces(prev => [...prev, place]);
    }
    setSidebarOpen(false);
    setSelectedPoint(null);
    setEditingIndex(null);
  };

  const submitToAirtable = async () => {
    if (!accessCode) {
      alert('Please enter your Access Code first.');
      return;
    }

    if (places.length === 0) return;

    if (!confirm(`Are you sure you want to submit ${places.length} places to Airtable?`)) {
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let errors = [];

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

    for (const place of places) {
      try {
        const response = await fetch(`${API_URL}/places`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': accessCode
          },
          body: JSON.stringify(place)
        });

        const result = await response.json();

        if (response.ok) {
          successCount++;
        } else {
          errors.push(`${place.spec.id}: ${result.error || 'Unknown error'}`);
        }
      } catch (err) {
        errors.push(`${place.spec.id}: Connection failed`);
      }
    }

    setIsSubmitting(false);

    if (successCount > 0) {
      alert(`Successfully submitted ${successCount} places to Airtable!`);
      // Optionally clear successful places or all places
      if (confirm('Would you like to clear the local list now?')) {
        setPlaces([]);
      }
    }

    if (errors.length > 0) {
      alert(`Errors occurred during submission:\n${errors.join('\n')}`);
    }
  };

  const deletePlace = (index: number) => {
    if (confirm(`Are you sure you want to delete "${places[index].spec.name}"?`)) {
      setPlaces(prev => prev.filter((_, i) => i !== index));
      if (editingIndex === index) {
        setSidebarOpen(false);
        setEditingIndex(null);
      }
    }
  };

  const startEdit = (index: number) => {
    const place = places[index];
    setEditingIndex(index);
    setSelectedPoint({
      lat: place.spec.location.latitude,
      lng: place.spec.location.longitude,
      name: place.spec.name,
      altitude: place.spec.location.altitude
    });
    setSidebarOpen(true);
  };

  const clearPlaces = () => {
    if (confirm('Are you sure you want to clear all added places?')) {
      setPlaces([]);
    }
  };

  const formData = React.useMemo(() => {
    if (editingIndex !== null) return places[editingIndex];
    if (!selectedPoint) return undefined;
    
    const provinceId = getProvinceForPoint(selectedPoint.lng, selectedPoint.lat);
    
    const links: any[] = [];
    if (selectedPoint.mapUrl) {
      links.push({
        title: 'Google Maps',
        url: selectedPoint.mapUrl,
        type: 'map'
      });
    }

    return {
      spec: {
        name: selectedPoint.name || '',
        location: {
          latitude: selectedPoint.lat,
          longitude: selectedPoint.lng,
          altitude: selectedPoint.altitude,
          province: provinceId ? `province/${provinceId}` : '',
        },
        links: links
      }
    } as Partial<Place>;
  }, [selectedPoint, editingIndex, places]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-sand dark:bg-stone-950">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terra mx-auto"></div>
          <p className="text-terra font-serif italic">Loading Morocco's Geography...</p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} region="MA">
      <div className="h-screen w-screen flex overflow-hidden bg-sand dark:bg-stone-950">
        {/* Main Content: Map */}
        <main className="flex-1 relative">
          <MapComponent 
            onPointSelect={onPointSelect} 
            selectedPoint={selectedPoint || undefined} 
            addedPlaces={places}
            onPlaceClick={startEdit}
          />

          {/* Bottom Toolbar Overlay */}
          <div className="absolute bottom-8 left-8 flex items-center gap-4 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl border border-clay dark:border-stone-800">
            <button 
              onClick={() => setPlacesListOpen(!isPlacesListOpen)}
              className="flex flex-col items-start hover:bg-clay/20 p-1 rounded-lg transition-colors"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal-light dark:text-stone-500">Places Saved</span>
              <span className="text-3xl font-serif font-black text-terra flex items-center gap-2">
                {places.length} <Edit3 size={16} className="text-stone-300" />
              </span>
            </button>
            
            <div className="h-10 w-px bg-clay dark:bg-stone-800 mx-2"></div>
            
            <div className="flex gap-2">
              <input 
                type="password" 
                placeholder="Access Code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="px-4 py-2 bg-sand/50 dark:bg-stone-800 border border-clay dark:border-stone-700 rounded-xl outline-none focus:ring-1 focus:ring-terra"
              />
              
              <button 
                onClick={submitToAirtable}
                disabled={isSubmitting || places.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-terra hover:bg-terra-dark disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-terra/20"
              >
                {isSubmitting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Download size={20} />} 
                {isSubmitting ? 'Submitting...' : 'Submit to Airtable'}
              </button>
              
              <button 
                onClick={() => exportToZip(places)}
                disabled={places.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 border border-clay dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-clay/10 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed font-bold rounded-xl transition-all"
              >
                ZIP
              </button>
              
              <button 
                onClick={clearPlaces}
                className="p-2.5 text-stone-400 hover:text-red-500 hover:bg-red-50/50 rounded-xl transition-all"
                title="Clear All"
              >
                <Trash2 size={24} />
              </button>
            </div>
          </div>

          {/* Floating Manage Places Sidebar */}
          {isPlacesListOpen && (
            <div className="absolute top-4 right-4 w-80 max-h-[85vh] flex flex-col bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl border border-clay dark:border-stone-800 shadow-2xl overflow-hidden animate-in slide-in-from-right-4">
              <div className="p-4 border-b border-clay dark:border-stone-800 flex justify-between items-center bg-sand/50 dark:bg-stone-950/50">
                <h3 className="font-serif font-bold text-terra">Manage Places</h3>
                <button onClick={() => setPlacesListOpen(false)} className="p-1 hover:bg-clay dark:hover:bg-stone-800 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {places.length === 0 && (
                  <div className="py-12 text-center">
                    <MapIcon className="mx-auto text-stone-300 mb-2" size={32} />
                    <p className="text-xs text-stone-400 italic px-8">No places added yet. Click on the map to start building your collection.</p>
                  </div>
                )}
                {places.map((p, i) => (
                  <div key={i} className={`group flex items-center gap-3 p-3 rounded-xl border transition-all ${editingIndex === i ? 'border-terra bg-terra/5 ring-1 ring-terra/20' : 'border-transparent hover:border-clay dark:hover:border-stone-800 hover:bg-clay/10'}`}>
                    <div className="bg-terra/10 p-2 rounded-lg text-terra">
                      <MapPin size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate leading-tight">{p.spec.name}</p>
                      <p className="text-[10px] text-charcoal-light dark:text-stone-500 truncate">{p.spec.location.province}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(i)} className="p-1.5 hover:bg-terra hover:text-white rounded-md text-stone-400 transition-all">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => deletePlace(i)} className="p-1.5 hover:bg-red-500 hover:text-white rounded-md text-stone-400 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Sidebar: Form */}
        <aside className={`w-[450px] h-full shadow-2xl z-20 transition-transform duration-300 border-l border-clay dark:border-stone-800 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full absolute right-0'}`}>
          {isSidebarOpen && (
            <PlaceForm 
              initialData={formData}
              onSubmit={onSavePlace}
              onCancel={() => {
                setSidebarOpen(false);
                setSelectedPoint(null);
                setEditingIndex(null);
              }}
            />
          )}
        </aside>
      </div>
    </APIProvider>
  );
};

export default App;
