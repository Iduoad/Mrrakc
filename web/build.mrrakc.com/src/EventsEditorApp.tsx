import React, { useCallback, useEffect, useMemo, useState } from 'react';
import EventForm from './components/EventForm';
import Modal from './components/Modal';
import { ToastContainer, type NotificationType } from './components/Notification';
import {
  makeEmptyEventDraft,
  eventToDraft,
  draftToEvent,
  type EventDraft,
} from './utils/eventDraft';
import type { Event } from './data/schema';
import {
  fetchEvents,
  fetchProvincesAll,
  fetchAllPlaces,
  saveEvent as apiSaveEvent,
  deleteEvent as apiDeleteEvent,
  type PlaceRef,
  type ProvinceRef,
  type LoadedEvent,
} from './utils/editorApi';
import {
  ArrowLeft, Search, CalendarClock, Plus, Trash2, MapPin,
} from 'lucide-react';

// Standalone events editor page (dev-only, open at /?editor=events). Like the
// plans editor it loads no Google Maps — events reference provinces/places by
// fuzzy search — so the page stays light.
const EventsEditorApp: React.FC = () => {
  const [provinces, setProvinces] = useState<ProvinceRef[]>([]);
  const [allPlaces, setAllPlaces] = useState<PlaceRef[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isReady, setIsReady] = useState(false);

  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingId, setEditingId] = useState<string | null>(null); // original id on disk
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Notifications
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: NotificationType }[]>([]);
  const addNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
  }, []);
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Modal
  const [modalState, setModalState] = useState<{
    isOpen: boolean; title: string; message: React.ReactNode;
    type: 'info' | 'success' | 'error' | 'confirm'; onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'info' });
  const showModal = useCallback((title: string, message: React.ReactNode, type: 'info' | 'success' | 'error' | 'confirm' = 'info', onConfirm?: () => void) => {
    setModalState({
      isOpen: true, title, message, type,
      onConfirm: onConfirm ? () => { onConfirm(); setModalState(prev => ({ ...prev, isOpen: false })); } : undefined,
    });
  }, []);
  const closeModal = useCallback(() => setModalState(prev => ({ ...prev, isOpen: false })), []);

  // Load provinces, places (for the pickers) and events up front.
  useEffect(() => {
    Promise.all([fetchEvents(), fetchProvincesAll(), fetchAllPlaces()])
      .then(([eventsRes, provincesRes, placesRes]) => {
        setEvents(eventsRes.events.map((l: LoadedEvent) => l.event));
        setProvinces(provincesRes.provinces);
        setAllPlaces(placesRes.places);
        if (eventsRes.errors.length) {
          addNotification(`${eventsRes.errors.length} event file(s) failed to parse (see console).`, 'error');
          console.warn('Unparseable event files:', eventsRes.errors);
        }
      })
      .catch(e => addNotification(`Failed to load data: ${e.message}`, 'error'))
      .finally(() => setIsReady(true));
  }, [addNotification]);

  const startNew = () => {
    setDraft(makeEmptyEventDraft());
    setEditingId(null);
    setView('editor');
  };

  const startEdit = (event: Event) => {
    setDraft(eventToDraft(event));
    setEditingId(event.spec.id);
    setView('editor');
  };

  const backToList = () => {
    setView('list');
    setDraft(null);
    setEditingId(null);
  };

  const onSaveEvent = async (event: Event) => {
    try {
      await apiSaveEvent(event, editingId ?? undefined);
      setEvents(prev => {
        const idx = prev.findIndex(e => e.spec.id === (editingId ?? event.spec.id));
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = event;
          return next;
        }
        return [...prev, event];
      });
      addNotification(editingId ? `Saved "${event.spec.name}".` : `Created "${event.spec.name}".`, 'success');
      backToList();
    } catch (e) {
      showModal('Save Failed', (e as Error).message, 'error');
    }
  };

  const onDeleteEvent = (id: string, name: string) => {
    showModal('Confirm Delete', `Delete "${name}" from disk? This removes ${id}.json.`, 'confirm', async () => {
      try {
        await apiDeleteEvent(id);
        setEvents(prev => prev.filter(e => e.spec.id !== id));
        if (editingId === id) backToList();
        addNotification(`Deleted "${name}".`, 'success');
      } catch (e) {
        showModal('Delete Failed', (e as Error).message, 'error');
      }
    });
  };

  const filteredEvents = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return [...events]
      .sort((a, b) => a.spec.name.localeCompare(b.spec.name))
      .filter(e =>
        e.spec.name.toLowerCase().includes(term) ||
        e.spec.id.toLowerCase().includes(term) ||
        (e.kind || '').toLowerCase().includes(term));
  }, [events, searchTerm]);

  if (!isReady) {
    return (
      <div className="h-dvh w-screen flex items-center justify-center bg-sand dark:bg-stone-950">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terra mx-auto"></div>
          <p className="text-terra font-serif italic">Loading events…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh w-screen flex flex-col bg-sand dark:bg-stone-950 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-4 px-5 md:px-8 py-4 border-b border-clay dark:border-stone-800 bg-white dark:bg-stone-900">
        <div className="bg-terra/10 p-2 rounded-xl text-terra">
          <CalendarClock size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif font-black text-lg text-terra leading-none">Events Editor</h1>
          <p className="text-[10px] uppercase tracking-widest text-stone-400 mt-1">
            {events.length} event{events.length === 1 ? '' : 's'} · {provinces.length} provinces · {allPlaces.length} places
          </p>
        </div>
        <a
          href="?editor=plans"
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-stone-500 hover:text-terra border border-clay dark:border-stone-700 rounded-xl transition-colors"
          title="Go to the plans editor"
        >
          <MapPin size={15} /> <span className="hidden sm:inline">Plans editor</span>
        </a>
        {view === 'list' && (
          <button
            onClick={startNew}
            className="flex items-center gap-2 px-4 py-2 bg-terra hover:bg-terra-dark text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-terra/20"
          >
            <Plus size={16} /> New event
          </button>
        )}
      </header>

      <div className="flex-1 overflow-hidden">
        {view === 'list' ? (
          <div className="h-full overflow-y-auto">
            <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <input
                  type="text"
                  placeholder="Search events…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-stone-900 border border-clay dark:border-stone-700 rounded-xl outline-none focus:ring-1 focus:ring-terra text-sm"
                />
              </div>

              {filteredEvents.length === 0 && (
                <div className="py-24 text-center">
                  <CalendarClock className="mx-auto text-stone-300 mb-2" size={48} />
                  <p className="text-sm text-stone-400 italic px-12">
                    {events.length === 0 ? 'No events yet. Click “New event” to create one.' : 'No events match your search.'}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {filteredEvents.map(event => {
                  const editionCount = event.spec.editions?.length ?? 0;
                  return (
                    <div
                      key={event.spec.id}
                      className="group flex items-center gap-3 p-4 rounded-xl border border-clay dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-terra hover:bg-terra/5 transition-all cursor-pointer"
                      onClick={() => startEdit(event)}
                    >
                      <div className="bg-terra/10 p-2.5 rounded-lg text-terra shrink-0">
                        <CalendarClock size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate leading-tight">{event.spec.name}</p>
                        <p className="text-[11px] text-stone-400 truncate">
                          {event.kind} · {event.spec.status} · {editionCount} edition(s)
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteEvent(event.spec.id, event.spec.name); }}
                        className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white rounded-md text-stone-300 transition-all shrink-0"
                        title="Delete event"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          draft && (
            <div className="h-full flex flex-col max-w-3xl mx-auto w-full border-x border-clay dark:border-stone-800 bg-white dark:bg-stone-900">
              <div className="shrink-0 p-4 border-b border-clay dark:border-stone-800 flex items-center gap-4 bg-sand/50 dark:bg-stone-950/50">
                <button onClick={backToList} className="p-2 hover:bg-clay dark:hover:bg-stone-800 rounded-full transition-colors text-terra" title="Back to list">
                  <ArrowLeft size={20} />
                </button>
                <h3 className="font-serif font-bold text-terra">{editingId ? 'Edit Event' : 'New Event'}</h3>
                <div className="flex-1" />
                {editingId && (
                  <button
                    onClick={() => onDeleteEvent(editingId, draftToEvent(draft).spec.name)}
                    className="p-2 hover:bg-red-500 hover:text-white rounded-full transition-colors text-stone-400"
                    title="Delete event"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <EventForm
                  draft={draft}
                  onChange={setDraft}
                  provinces={provinces}
                  allPlaces={allPlaces}
                  onSubmit={onSaveEvent}
                  onCancel={backToList}
                  onError={(m) => addNotification(m, 'error')}
                  isEditing={!!editingId}
                />
              </div>
            </div>
          )
        )}
      </div>

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
  );
};

export default EventsEditorApp;
