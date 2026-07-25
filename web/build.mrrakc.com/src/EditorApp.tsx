import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { MapComponent } from './components/MapComponent';
import PlaceForm from './components/PlaceForm';
import Modal from './components/Modal';
import { ToastContainer, type NotificationType } from './components/Notification';
import { loadProvinces, getProvinceForPoint } from './utils/geo';
import {
  fetchProvinces,
  fetchPlaces,
  savePlace,
  deletePlace as apiDeletePlace,
  type ProvinceInfo,
} from './utils/editorApi';
import type { Place } from './data/schema';
import { X, MapPin, Search, ArrowLeft, RefreshCw, MapPinned, Route } from 'lucide-react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Identity of a place as it currently exists on disk (for rename/move handling).
const identity = (p: Place) => ({
  province: p.spec.location.province.replace('province/', ''),
  id: p.spec.id,
});

// Merge form output over the originally-loaded place so fields the form does
// not manage are never dropped.
function mergePlace(original: Place | undefined, formOut: Place): Place {
  if (!original) return formOut;
  return {
    ...original,
    ...formOut,
    metadata: formOut.metadata ?? original.metadata,
    spec: { ...original.spec, ...formOut.spec },
  };
}

const EditorApp: React.FC = () => {
  const [provinces, setProvinces] = useState<ProvinceInfo[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoadingProvince, setIsLoadingProvince] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ lat: number; lng: number; zoom?: number } | undefined>();

  const [selectedPoint, setSelectedPoint] = useState<{
    lat: number; lng: number; name?: string; altitude?: number; mapUrl?: string;
  } | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarView, setSidebarView] = useState<'list' | 'editor'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [isReady, setIsReady] = useState(false);

  const [notifications, setNotifications] = useState<{ id: string; message: string; type: NotificationType }[]>([]);
  const addNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
  }, []);
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const [modalState, setModalState] = useState<{
    isOpen: boolean; title: string; message: string | React.ReactNode;
    type: 'info' | 'success' | 'error' | 'confirm'; onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'info' });

  const showModal = useCallback((title: string, message: string | React.ReactNode, type: 'info' | 'success' | 'error' | 'confirm' = 'info', onConfirm?: () => void) => {
    setModalState({
      isOpen: true, title, message, type,
      onConfirm: onConfirm ? () => { onConfirm(); setModalState(prev => ({ ...prev, isOpen: false })); } : undefined,
    });
  }, []);
  const closeModal = useCallback(() => setModalState(prev => ({ ...prev, isOpen: false })), []);

  // Load geo data + province list on mount
  useEffect(() => {
    Promise.all([loadProvinces(), fetchProvinces()])
      .then(([, provs]) => setProvinces(provs))
      .catch(e => addNotification(`Failed to load provinces: ${e.message}`, 'error'))
      .finally(() => setIsReady(true));
  }, [addNotification]);

  const loadProvincePlaces = useCallback(async (province: string) => {
    if (!province) return;
    setIsLoadingProvince(true);
    setSidebarView('list');
    setEditingIndex(null);
    setSelectedPoint(null);
    try {
      const { places: loaded, errors } = await fetchPlaces(province);
      const parsed = loaded.map(l => l.place);
      setPlaces(parsed);
      if (errors.length) {
        addNotification(`${errors.length} file(s) failed to parse (see console).`, 'error');
        console.warn('Unparseable place files:', errors);
      }
      // Center on the province (centroid of its places)
      if (parsed.length) {
        const lat = parsed.reduce((s, p) => s + p.spec.location.latitude, 0) / parsed.length;
        const lng = parsed.reduce((s, p) => s + p.spec.location.longitude, 0) / parsed.length;
        setFocusPoint({ lat, lng, zoom: 10 });
      }
      addNotification(`Loaded ${parsed.length} place(s) from ${province}.`, 'success');
    } catch (e) {
      addNotification(`Failed to load ${province}: ${(e as Error).message}`, 'error');
    } finally {
      setIsLoadingProvince(false);
    }
  }, [addNotification]);

  const onSelectProvince = (province: string) => {
    setSelectedProvince(province);
    loadProvincePlaces(province);
  };

  const onPointSelect = useCallback((lat: number, lng: number, name?: string, altitude?: number, mapUrl?: string) => {
    setSelectedPoint({ lat, lng, name, altitude, mapUrl });
    setEditingIndex(null);
    setSidebarView('editor');
    setSidebarOpen(true);
  }, []);

  const startEdit = (index: number) => {
    const place = places[index];
    setEditingIndex(index);
    setSelectedPoint({
      lat: place.spec.location.latitude,
      lng: place.spec.location.longitude,
      name: place.spec.name,
      altitude: place.spec.location.altitude,
    });
    setSidebarView('editor');
    setSidebarOpen(true);
  };

  const onSavePlace = async (formOut: Place) => {
    const original = editingIndex !== null ? places[editingIndex] : undefined;
    const prev = original ? identity(original) : undefined;
    const merged = mergePlace(original, formOut);
    try {
      await savePlace(merged, prev);
      setPlaces(prev => {
        if (editingIndex !== null) {
          const next = [...prev];
          next[editingIndex] = merged;
          return next;
        }
        return [...prev, merged];
      });
      addNotification(
        editingIndex !== null ? `Saved "${merged.spec.name}".` : `Created "${merged.spec.name}".`,
        'success',
      );
      // Refresh province counts if a new file was added
      if (editingIndex === null) {
        fetchProvinces().then(setProvinces).catch(() => {});
      }
      setSidebarView('list');
      setSelectedPoint(null);
      setEditingIndex(null);
    } catch (e) {
      showModal('Save Failed', (e as Error).message, 'error');
    }
  };

  const deletePlace = (index: number) => {
    const place = places[index];
    showModal('Confirm Delete', `Delete "${place.spec.name}" from disk? This removes the JSON file.`, 'confirm', async () => {
      const { province, id } = identity(place);
      try {
        await apiDeletePlace(province, id);
        setPlaces(prev => prev.filter((_, i) => i !== index));
        if (editingIndex === index) {
          setSidebarView('list');
          setEditingIndex(null);
          setSelectedPoint(null);
        }
        addNotification(`Deleted "${place.spec.name}".`, 'success');
        fetchProvinces().then(setProvinces).catch(() => {});
      } catch (e) {
        showModal('Delete Failed', (e as Error).message, 'error');
      }
    });
  };

  const formData = useMemo(() => {
    if (editingIndex !== null) return places[editingIndex];
    if (!selectedPoint) return undefined;

    const provinceId = getProvinceForPoint(selectedPoint.lng, selectedPoint.lat) || selectedProvince || 'marrakesh';
    const links: Place['spec']['links'] = [];
    if (selectedPoint.mapUrl) {
      links.push({ title: 'Google Maps', url: selectedPoint.mapUrl, type: 'map' });
    }
    return {
      spec: {
        name: selectedPoint.name || '',
        location: {
          latitude: selectedPoint.lat,
          longitude: selectedPoint.lng,
          altitude: selectedPoint.altitude,
          province: `province/${provinceId}`,
        },
        links,
      },
    } as Partial<Place>;
  }, [selectedPoint, editingIndex, places, selectedProvince]);

  const filteredPlaces = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return places.map((p, i) => ({ place: p, originalIndex: i }))
      .filter(({ place }) =>
        place.spec.name.toLowerCase().includes(term) || place.kind.toLowerCase().includes(term));
  }, [places, searchTerm]);

  const onMapError = useCallback((msg: string) => addNotification(msg, 'error'), [addNotification]);

  if (!isReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-sand dark:bg-stone-950">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terra mx-auto"></div>
          <p className="text-terra font-serif italic">Loading editor…</p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} region="MA">
      <div className="h-dvh w-screen flex overflow-hidden bg-sand dark:bg-stone-950">
        <main className="flex-1 relative min-h-0">
          <MapComponent
            onPointSelect={onPointSelect}
            selectedPoint={selectedPoint || undefined}
            addedPlaces={places}
            onPlaceClick={startEdit}
            onMenuClick={() => { setSidebarView('list'); setSidebarOpen(true); }}
            isSidebarOpen={isSidebarOpen}
            onError={onMapError}
            focusPoint={focusPoint}
          />

          {/* Bottom toolbar: province selector */}
          <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-clay dark:border-stone-800 max-w-[95vw] z-10 whitespace-nowrap">
            <div className="flex items-center gap-2 text-terra">
              <MapPinned size={18} />
              <span className="text-[9px] font-bold uppercase tracking-widest text-charcoal-light dark:text-stone-500">Province</span>
            </div>
            <select
              value={selectedProvince}
              onChange={(e) => onSelectProvince(e.target.value)}
              className="bg-sand/50 dark:bg-stone-800 border border-clay dark:border-stone-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-terra max-w-[200px]"
            >
              <option value="">Select a province…</option>
              {provinces.map(p => (
                <option key={p.id} value={p.id}>{p.id} ({p.count})</option>
              ))}
            </select>
            {selectedProvince && (
              <button
                onClick={() => loadProvincePlaces(selectedProvince)}
                className="p-2 text-terra hover:bg-clay/10 rounded-xl transition-colors"
                title="Reload from disk"
              >
                <RefreshCw size={18} className={isLoadingProvince ? 'animate-spin' : ''} />
              </button>
            )}
            <div className="h-6 w-px bg-clay dark:bg-stone-800 mx-1"></div>
            <button
              onClick={() => { setSidebarView('list'); setSidebarOpen(true); }}
              className="flex flex-col items-start px-1 hover:bg-clay/10 transition-colors rounded-lg"
              title="Open list"
            >
              <span className="text-[9px] font-bold uppercase tracking-widest text-charcoal-light dark:text-stone-500 leading-none mb-1">Places</span>
              <span className="text-xl font-serif font-black text-terra leading-none">{places.length}</span>
            </button>
            <div className="h-6 w-px bg-clay dark:bg-stone-800 mx-1"></div>
            <a
              href="?editor=plans"
              className="flex items-center gap-2 px-3 py-2 text-terra hover:bg-clay/10 rounded-xl transition-colors text-xs font-bold"
              title="Open the plans (itinerary) editor"
            >
              <Route size={16} /> Plans
            </a>
          </div>
        </main>

        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'w-full md:w-[450px]' : 'w-0'} h-full shadow-2xl z-40 transition-all duration-300 border-l border-clay dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden relative flex flex-col`}>
          {sidebarView === 'list' ? (
            <>
              <div className="p-4 border-b border-clay dark:border-stone-800 flex justify-between items-center bg-sand/50 dark:bg-stone-950/50 min-w-full md:min-w-[450px]">
                <div>
                  <h3 className="font-serif font-bold text-terra">Editor</h3>
                  <p className="text-[10px] uppercase tracking-widest text-stone-400">{selectedProvince || 'no province selected'}</p>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2.5 md:p-1.5 hover:bg-clay dark:hover:bg-stone-800 rounded-md transition-colors">
                  <X size={20} className="md:w-4 md:h-4" />
                </button>
              </div>

              <div className="p-4 min-w-full md:min-w-[450px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search loaded places…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 md:py-2 bg-sand/50 dark:bg-stone-800 border border-clay dark:border-stone-700 rounded-xl outline-none focus:ring-1 focus:ring-terra text-base md:text-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-1 min-w-full md:min-w-[450px]">
                {!selectedProvince && (
                  <div className="py-24 text-center">
                    <MapPinned className="mx-auto text-stone-300 mb-2" size={48} />
                    <p className="text-sm text-stone-400 italic px-12">Select a province below to load its places.</p>
                  </div>
                )}
                {selectedProvince && filteredPlaces.length === 0 && !isLoadingProvince && (
                  <div className="py-24 text-center">
                    <MapPin className="mx-auto text-stone-300 mb-2" size={48} />
                    <p className="text-sm text-stone-400 italic px-12">No places. Click the map to add one.</p>
                  </div>
                )}
                {filteredPlaces.map(({ place: p, originalIndex: i }) => (
                  <div
                    key={i}
                    className={`group flex items-center gap-3 p-4 md:p-3 rounded-xl border transition-all cursor-pointer ${editingIndex === i ? 'border-terra bg-terra/5 ring-1 ring-terra/20' : 'border-transparent hover:border-clay dark:hover:border-stone-800 hover:bg-clay/5'}`}
                    onClick={() => startEdit(i)}
                  >
                    <div className="bg-terra/10 p-2.5 md:p-2 rounded-lg text-terra shrink-0">
                      <MapPin size={18} className="md:w-4 md:h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate leading-tight">{p.spec.name}</p>
                      <p className="text-[11px] md:text-[10px] text-stone-400 truncate">{p.kind}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col min-w-full md:min-w-[450px]">
              <div className="p-4 border-b border-clay dark:border-stone-800 flex items-center gap-4 bg-sand/50 dark:bg-stone-950/50">
                <button
                  onClick={() => { setSidebarView('list'); setSelectedPoint(null); setEditingIndex(null); }}
                  className="p-3 md:p-2 hover:bg-clay dark:hover:bg-stone-800 rounded-full transition-colors text-terra"
                  title="Back to List"
                >
                  <ArrowLeft size={24} className="md:w-5 md:h-5" />
                </button>
                <h3 className="font-serif font-bold text-terra">{editingIndex !== null ? 'Edit Place' : 'New Place'}</h3>
                <div className="flex-1"></div>
                {editingIndex !== null && (
                  <button
                    onClick={() => deletePlace(editingIndex)}
                    className="p-3 md:p-2 hover:bg-red-500 hover:text-white rounded-full transition-colors text-stone-400"
                    title="Delete place"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <PlaceForm
                  initialData={formData}
                  lenient
                  onSubmit={onSavePlace}
                  onError={(m) => addNotification(m, 'error')}
                  onCancel={() => { setSidebarView('list'); setSelectedPoint(null); setEditingIndex(null); }}
                />
              </div>
            </div>
          )}
        </aside>

        <Modal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          title={modalState.title}
          message={modalState.message}
          type={modalState.type}
          onConfirm={modalState.onConfirm}
        />
        <ToastContainer notifications={notifications} removeNotification={removeNotification} />
      </div>
    </APIProvider>
  );
};

export default EditorApp;
