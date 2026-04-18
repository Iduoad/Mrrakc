import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { MapComponent } from './components/MapComponent';
import PlaceForm from './components/PlaceForm';
import Modal from './components/Modal';
import { ToastContainer, type NotificationType } from './components/Notification';
import { loadProvinces, getProvinceForPoint } from './utils/geo';
import { exportToZip } from './utils/export';
import { StorageManager } from './utils/storage';
import type { Place } from './data/schema';
import { Download, Trash2, Map as MapIcon, X, MapPin, Search, ChevronRight, ChevronDown, ArrowLeft } from 'lucide-react';

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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(() => !localStorage.getItem('mrrakc-splash-seen'));
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<'list' | 'editor'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [accessCode, setAccessCode] = useState(() => StorageManager.loadAccessCode());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedProvinces, setExpandedProvinces] = useState<Record<string, boolean>>({});
  
  // Notification State
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: NotificationType }[]>([]);

  const addNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    type: 'info' | 'success' | 'error' | 'confirm';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const hasLoaded = useRef(false);

  const showModal = useCallback((title: string, message: string | React.ReactNode, type: 'info' | 'success' | 'error' | 'confirm' = 'info', onConfirm?: () => void) => {
    setModalState({ 
      isOpen: true, 
      title, 
      message, 
      type, 
      onConfirm: onConfirm ? () => {
        onConfirm();
        setModalState(prev => ({ ...prev, isOpen: false }));
      } : undefined 
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Load persistence and geo data
  useEffect(() => {
    const savedPlaces = StorageManager.loadPlaces();
    
    // Check if we were editing something
    const savedDraft = localStorage.getItem('mrrakc-builder-draft-point');
    const savedEditingIndex = localStorage.getItem('mrrakc-builder-draft-index');

    loadProvinces().then(() => {
      if (savedPlaces.length > 0) {
        setPlaces(savedPlaces);
      }
      if (savedDraft) {
        setSelectedPoint(JSON.parse(savedDraft));
        setSidebarView('editor');
      }
      if (savedEditingIndex !== null) {
        setEditingIndex(parseInt(savedEditingIndex, 10));
        setSidebarView('editor');
      }

      setIsLoading(false);
      hasLoaded.current = true;
    });
  }, []);

  const handleStartBuilding = () => {
    setShowSplash(false);
    localStorage.setItem('mrrakc-splash-seen', 'true');
  };

  // Save persistence
  useEffect(() => {
    if (hasLoaded.current) {
      StorageManager.savePlaces(places);
    }
  }, [places]);

  useEffect(() => {
    StorageManager.saveAccessCode(accessCode);
  }, [accessCode]);

  useEffect(() => {
    if (selectedPoint) {
      localStorage.setItem('mrrakc-builder-draft-point', JSON.stringify(selectedPoint));
    } else {
      localStorage.removeItem('mrrakc-builder-draft-point');
    }
  }, [selectedPoint]);

  useEffect(() => {
    if (editingIndex !== null) {
      localStorage.setItem('mrrakc-builder-draft-index', editingIndex.toString());
    } else {
      localStorage.removeItem('mrrakc-builder-draft-index');
    }
  }, [editingIndex]);

  const onPointSelect = useCallback((lat: number, lng: number, name?: string, altitude?: number, mapUrl?: string) => {
    setSelectedPoint({ lat, lng, name, altitude, mapUrl });
    setEditingIndex(null); 
    setSidebarView('editor');
    setSidebarOpen(true);
  }, []);

  const onSavePlace = (place: Place) => {
    const now = new Date().toISOString();
    if (editingIndex !== null) {
      const newPlaces = [...places];
      newPlaces[editingIndex] = {
        ...place,
        _internal: {
          createdAt: places[editingIndex]._internal?.createdAt || now,
          lastModified: now
        }
      };
      setPlaces(newPlaces);
    } else {
      setPlaces(prev => [...prev, {
        ...place,
        _internal: {
          createdAt: now,
          lastModified: now
        }
      }]);
    }
    setSidebarView('list');
    setSelectedPoint(null);
    setEditingIndex(null);
  };

  const performAirtableSubmission = async () => {
    setIsSubmitting(true);
    let successCount = 0;
    const errors: string[] = [];

    const API_URL = import.meta.env.VITE_API_URL || 
      (import.meta.env.PROD ? 'https://api.mrrakc.com' : 'http://localhost:8787');

    for (const place of places) {
      try {
        const { _internal, ...submitData } = place;
        console.log('Submitting place:', _internal?.lastModified); // Use variable
        const response = await fetch(`${API_URL}/places`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': accessCode
          },
          body: JSON.stringify(submitData)
        });

        const result = await response.json();

        if (response.ok) {
          successCount++;
        } else {
          errors.push(`${place.spec.id}: ${result.error || 'Unknown error'}`);
        }
      } catch {
        errors.push(`${place.spec.id}: Connection failed`);
      }
    }

    setIsSubmitting(false);

    if (successCount > 0) {
      addNotification(`Successfully submitted ${successCount} places to Airtable.`, 'success');
      setPlaces([]);
    }

    if (errors.length > 0) {
      showModal(
        'Submission Errors', 
        `Errors occurred during submission:\n${errors.join('\n')}`, 
        'error'
      );
    }
  };

  const submitToAirtable = async () => {
    if (!accessCode) {
      showModal('Access Code Required', 'Please enter your Access Code first.', 'info');
      return;
    }

    if (places.length === 0) return;

    showModal(
      'Confirm Submission', 
      `Are you sure you want to submit ${places.length} places to Airtable?`, 
      'confirm', 
      performAirtableSubmission
    );
  };

  const deletePlace = (index: number) => {
    showModal(
      'Confirm Delete', 
      `Are you sure you want to delete "${places[index].spec.name}"?`, 
      'confirm', 
      () => {
        setPlaces(prev => prev.filter((_, i) => i !== index));
        if (editingIndex === index) {
          setSidebarView('list');
          setEditingIndex(null);
          setSelectedPoint(null);
        }
      }
    );
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
    setSidebarView('editor');
    setSidebarOpen(true);
  };

  const clearPlaces = () => {
    showModal(
      'Clear All Places', 
      'Are you sure you want to clear all added places? This cannot be undone.', 
      'confirm', 
      () => setPlaces([])
    );
  };

  const formData = useMemo(() => {
    if (editingIndex !== null) return places[editingIndex];
    if (!selectedPoint) return undefined;
    
    const provinceId = getProvinceForPoint(selectedPoint.lng, selectedPoint.lat);
    
    const links: Place['spec']['links'] = [];
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
          province: provinceId ? `province/${provinceId}` : 'province/marrakesh',
        },
        links: links
      }
    } as Partial<Place>;
  }, [selectedPoint, editingIndex, places]);

  const filteredPlaces = useMemo(() => {
    return places.map((p, i) => ({ place: p, originalIndex: i }))
      .filter(({ place }) => 
        place.spec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        place.spec.location.province.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [places, searchTerm]);

  const groupedPlaces = useMemo(() => {
    return filteredPlaces.reduce((acc, item) => {
      const province = item.place.spec.location.province.replace('province/', '') || 'Unknown';
      if (!acc[province]) acc[province] = [];
      acc[province].push(item);
      return acc;
    }, {} as Record<string, { place: Place, originalIndex: number }[]>);
  }, [filteredPlaces]);

  const toggleProvince = (province: string) => {
    setExpandedProvinces(prev => ({ ...prev, [province]: !prev[province] }));
  };

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
            onMenuClick={() => {
              setSidebarView('list');
              setSidebarOpen(true);
            }}
            isSidebarOpen={isSidebarOpen}
          />

          {/* Bottom Toolbar Overlay */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl border border-clay dark:border-stone-800 max-w-[95vw] z-10 whitespace-nowrap overflow-x-auto no-scrollbar">
            <button 
              onClick={() => {
                setSidebarView('list');
                setSidebarOpen(true);
              }}
              className="flex flex-col items-start px-2 shrink-0 border-r border-clay dark:border-stone-800 pr-4 mr-2 hover:bg-clay/10 transition-colors group"
              title="Open Manage Places sidebar"
            >
              <span className="text-[9px] font-bold uppercase tracking-widest text-charcoal-light dark:text-stone-500 leading-none mb-1">Places</span>
              <span className="text-xl font-serif font-black text-terra leading-none group-hover:scale-110 transition-transform">
                {places.length}
              </span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="px-4 py-3 md:py-2 bg-sand/50 dark:bg-stone-800 border border-clay dark:border-stone-700 rounded-xl outline-none focus:ring-1 focus:ring-terra text-base md:text-sm w-24 sm:w-48 font-mono transition-all"
                  title="Your API access code for Airtable"
                />
              </div>
              
              <button 
                onClick={submitToAirtable}
                disabled={isSubmitting || places.length === 0}
                className="flex items-center gap-2 px-4 py-3 md:py-2.5 bg-terra hover:bg-terra-dark disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-base md:text-sm font-bold rounded-xl transition-all shadow-lg shadow-terra/20 shrink-0"
                title="Send all saved places to Airtable. This will clear the local list on success."
              >
                {isSubmitting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Download size={20} className="md:w-4 md:h-4" />} 
                <span>{isSubmitting ? '...' : 'Submit'}</span>
              </button>
              
              <button 
                onClick={() => exportToZip(places)}
                disabled={places.length === 0}
                className="hidden lg:flex items-center gap-2 px-4 py-3 md:py-2.5 border border-clay dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-clay/10 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed text-base md:text-sm font-bold rounded-xl transition-all shrink-0"
                title="Download all places as a ZIP file containing JSON files organized by province."
              >
                <Download size={20} className="rotate-180 md:w-4 md:h-4" /> 
                <span>ZIP</span>
              </button>

              <div className="hidden lg:block h-6 w-px bg-clay dark:bg-stone-800 mx-1"></div>

              <button 
                onClick={clearPlaces}
                disabled={places.length === 0}
                className="p-2.5 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Delete all unsaved places from your local list."
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        </main>

        {/* Unified Sidebar Panel */}
        <aside className={`${isSidebarOpen ? 'w-full md:w-[450px]' : 'w-0'} h-full shadow-2xl z-40 transition-all duration-300 border-l border-clay dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden relative flex flex-col`}>
          {sidebarView === 'list' ? (
            <>
              <div className="p-4 border-b border-clay dark:border-stone-800 flex justify-between items-center bg-sand/50 dark:bg-stone-950/50 min-w-full md:min-w-[450px]">
                <h3 className="font-serif font-bold text-terra">Manage Places</h3>
                <div className="flex gap-1">
                  <button 
                    onClick={clearPlaces}
                    className="p-2.5 md:p-1.5 text-stone-400 hover:text-red-500 rounded-md transition-colors"
                    title="Clear All"
                  >
                    <Trash2 size={20} className="md:w-4 md:h-4" />
                  </button>
                  <button onClick={() => setSidebarOpen(false)} className="p-2.5 md:p-1.5 hover:bg-clay dark:hover:bg-stone-800 rounded-md transition-colors">
                    <X size={20} className="md:w-4 md:h-4" />
                  </button>
                </div>
              </div>
              
              <div className="p-4 min-w-full md:min-w-[450px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search saved places..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 md:py-2 bg-sand/50 dark:bg-stone-800 border border-clay dark:border-stone-700 rounded-xl outline-none focus:ring-1 focus:ring-terra text-base md:text-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-w-full md:min-w-[450px]">
                {Object.keys(groupedPlaces).length === 0 && (
                  <div className="py-24 text-center">
                    <MapIcon className="mx-auto text-stone-300 mb-2" size={48} />
                    <p className="text-sm text-stone-400 italic px-12">No places found. Click on the map to start building your collection.</p>
                  </div>
                )}
                
                {Object.entries(groupedPlaces).sort().map(([province, items]) => (
                  <div key={province} className="space-y-1">
                    <button 
                      onClick={() => toggleProvince(province)}
                      className="w-full flex items-center justify-between px-2 py-2 md:py-1.5 text-[11px] md:text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:bg-clay/10 rounded-md"
                    >
                      <span className="flex items-center gap-2">
                        {expandedProvinces[province] !== false ? <ChevronDown size={14} className="md:w-3 md:h-3" /> : <ChevronRight size={14} className="md:w-3 md:h-3" />}
                        {province} ({items.length})
                      </span>
                    </button>
                    
                    {(expandedProvinces[province] !== false) && (
                      <div className="space-y-1 ml-1">
                        {items.map(({ place: p, originalIndex: i }) => (
                          <div key={i} className={`group flex items-center gap-3 p-4 md:p-3 rounded-xl border transition-all cursor-pointer ${editingIndex === i ? 'border-terra bg-terra/5 ring-1 ring-terra/20' : 'border-transparent hover:border-clay dark:hover:border-stone-800 hover:bg-clay/5'}`} onClick={() => startEdit(i)}>
                            <div className="bg-terra/10 p-2.5 md:p-2 rounded-lg text-terra shrink-0">
                              <MapPin size={18} className="md:w-4 md:h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate leading-tight">{p.spec.name}</p>
                              <p className="text-[11px] md:text-[10px] text-stone-400 truncate">{p.kind}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                              <button 
                                onClick={(e) => { e.stopPropagation(); deletePlace(i); }} 
                                className="p-2 md:p-1.5 hover:bg-red-500 hover:text-white rounded-md text-stone-300 transition-all"
                              >
                                <Trash2 size={18} className="md:w-3.5 md:h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col min-w-full md:min-w-[450px]">
              <div className="p-4 border-b border-clay dark:border-stone-800 flex items-center gap-4 bg-sand/50 dark:bg-stone-950/50">
                <button 
                  onClick={() => {
                    setSidebarView('list');
                    setSelectedPoint(null);
                    setEditingIndex(null);
                  }}
                  className="p-3 md:p-2 hover:bg-clay dark:hover:bg-stone-800 rounded-full transition-colors text-terra"
                  title="Back to List"
                >
                  <ArrowLeft size={24} className="md:w-5 md:h-5" />
                </button>
                <h3 className="font-serif font-bold text-terra">
                  {editingIndex !== null ? 'Edit Place' : 'New Place'}
                </h3>
                <div className="flex-1"></div>
                <button onClick={() => setSidebarOpen(false)} className="p-3 md:p-2 hover:bg-clay dark:hover:bg-stone-800 rounded-full transition-colors">
                  <X size={24} className="md:w-5 md:h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <PlaceForm 
                  initialData={formData}
                  onSubmit={onSavePlace}
                  onCancel={() => {
                    setSidebarView('list');
                    setSelectedPoint(null);
                    setEditingIndex(null);
                  }}
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

        <ToastContainer 
          notifications={notifications} 
          removeNotification={removeNotification} 
        />

        {showSplash && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-sand/40 dark:bg-stone-950/40 backdrop-blur-md animate-in fade-in duration-500">
            <div className="max-w-md w-full bg-white/90 dark:bg-stone-900/90 p-10 rounded-3xl shadow-2xl border border-clay dark:border-stone-800 text-center space-y-8 animate-in zoom-in-95 duration-300">
              <div className="bg-terra/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto text-terra ring-8 ring-terra/5">
                <MapPin size={40} />
              </div>
              
              <div className="space-y-3">
                <h1 className="text-3xl font-serif font-black text-charcoal dark:text-stone-100">
                  Welcome to Mrrakc
                </h1>
                <p className="text-charcoal-light dark:text-stone-400 text-sm leading-relaxed">
                  Start building your curated map of Morocco. Explore the landscape, identify unique spots, and add them to our growing collection.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 text-left">
                <div className="flex items-start gap-4 p-4 bg-sand/50 dark:bg-stone-950/30 rounded-2xl border border-clay/50 dark:border-stone-800/50">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-terra text-white flex items-center justify-center text-xs font-black italic">1</div>
                  <p className="text-xs text-charcoal dark:text-stone-300 font-medium">Click anywhere on the map to pin a new location.</p>
                </div>
                <div className="flex items-start gap-4 p-4 bg-sand/50 dark:bg-stone-950/30 rounded-2xl border border-clay/50 dark:border-stone-800/50">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-terra text-white flex items-center justify-center text-xs font-black italic">2</div>
                  <p className="text-xs text-charcoal dark:text-stone-300 font-medium">Fill in the details and save it to your local list.</p>
                </div>
                <div className="flex items-start gap-4 p-4 bg-sand/50 dark:bg-stone-950/30 rounded-2xl border border-clay/50 dark:border-stone-800/50">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-terra text-white flex items-center justify-center text-xs font-black italic">3</div>
                  <p className="text-xs text-charcoal dark:text-stone-300 font-medium">Submit your collection to the cloud when ready.</p>
                </div>
              </div>

              <button 
                onClick={handleStartBuilding}
                className="w-full py-4 bg-terra hover:bg-terra-dark text-white font-black rounded-2xl shadow-xl shadow-terra/20 transition-all active:scale-[0.98] uppercase tracking-widest text-sm"
              >
                Start Building
              </button>
            </div>
          </div>
        )}
      </div>
    </APIProvider>
  );
};

export default App;
