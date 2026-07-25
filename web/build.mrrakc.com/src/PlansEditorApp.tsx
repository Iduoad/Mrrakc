import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PlanForm from './components/PlanForm';
import Modal from './components/Modal';
import { ToastContainer, type NotificationType } from './components/Notification';
import {
  makeEmptyDraft,
  planToDraft,
  type PlanDraft,
} from './utils/planDraft';
import type { Plan } from './data/schema';
import {
  fetchAllPlaces,
  fetchPlans,
  fetchPeople,
  savePlan as apiSavePlan,
  deletePlan as apiDeletePlan,
  type PlaceRef,
  type PersonRef,
  type LoadedPlan,
} from './utils/editorApi';
import {
  ArrowLeft, Search, Route, Plus, Trash2, MapPin,
} from 'lucide-react';

// Standalone plans editor page (dev-only, open at /?editor=plans). Unlike the
// places editor it loads no Google Maps — places are added purely by fuzzy
// search — so the page stays light.
const PlansEditorApp: React.FC = () => {
  const [allPlaces, setAllPlaces] = useState<PlaceRef[]>([]);
  const [people, setPeople] = useState<PersonRef[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isReady, setIsReady] = useState(false);

  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingId, setEditingId] = useState<string | null>(null); // original id on disk
  const [draft, setDraft] = useState<PlanDraft | null>(null);
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

  // Load places (for the picker), plans and people up front.
  useEffect(() => {
    Promise.all([fetchAllPlaces(), fetchPlans(), fetchPeople()])
      .then(([placesRes, plansRes, peopleRes]) => {
        setAllPlaces(placesRes.places);
        setPlans(plansRes.plans.map((l: LoadedPlan) => l.plan));
        setPeople(peopleRes.people);
        if (plansRes.errors.length) {
          addNotification(`${plansRes.errors.length} plan file(s) failed to parse (see console).`, 'error');
          console.warn('Unparseable plan files:', plansRes.errors);
        }
      })
      .catch(e => addNotification(`Failed to load data: ${e.message}`, 'error'))
      .finally(() => setIsReady(true));
  }, [addNotification]);

  const placesByRef = useMemo(() => {
    const m = new Map<string, PlaceRef>();
    for (const p of allPlaces) m.set(p.ref, p);
    return m;
  }, [allPlaces]);

  const startNew = () => {
    setDraft(makeEmptyDraft());
    setEditingId(null);
    setView('editor');
  };

  const startEdit = (plan: Plan) => {
    setDraft(planToDraft(plan));
    setEditingId(plan.spec.id);
    setView('editor');
  };

  const backToList = () => {
    setView('list');
    setDraft(null);
    setEditingId(null);
  };

  const onSavePlan = async (plan: Plan) => {
    try {
      await apiSavePlan(plan, editingId ?? undefined);
      setPlans(prev => {
        const idx = prev.findIndex(p => p.spec.id === (editingId ?? plan.spec.id));
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = plan;
          return next;
        }
        return [...prev, plan];
      });
      addNotification(editingId ? `Saved "${plan.spec.title}".` : `Created "${plan.spec.title}".`, 'success');
      backToList();
    } catch (e) {
      showModal('Save Failed', (e as Error).message, 'error');
    }
  };

  const onDeletePlan = (id: string, title: string) => {
    showModal('Confirm Delete', `Delete "${title}" from disk? This removes ${id}.json.`, 'confirm', async () => {
      try {
        await apiDeletePlan(id);
        setPlans(prev => prev.filter(p => p.spec.id !== id));
        if (editingId === id) backToList();
        addNotification(`Deleted "${title}".`, 'success');
      } catch (e) {
        showModal('Delete Failed', (e as Error).message, 'error');
      }
    });
  };

  const filteredPlans = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return plans.filter(p =>
      p.spec.title.toLowerCase().includes(term) ||
      p.spec.id.toLowerCase().includes(term) ||
      (p.kind || '').toLowerCase().includes(term));
  }, [plans, searchTerm]);

  if (!isReady) {
    return (
      <div className="h-dvh w-screen flex items-center justify-center bg-sand dark:bg-stone-950">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terra mx-auto"></div>
          <p className="text-terra font-serif italic">Loading plans…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh w-screen flex flex-col bg-sand dark:bg-stone-950 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-4 px-5 md:px-8 py-4 border-b border-clay dark:border-stone-800 bg-white dark:bg-stone-900">
        <div className="bg-terra/10 p-2 rounded-xl text-terra">
          <Route size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif font-black text-lg text-terra leading-none">Plans Editor</h1>
          <p className="text-[10px] uppercase tracking-widest text-stone-400 mt-1">
            {plans.length} itinerar{plans.length === 1 ? 'y' : 'ies'} · {allPlaces.length} places available
          </p>
        </div>
        <a
          href="?editor"
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-stone-500 hover:text-terra border border-clay dark:border-stone-700 rounded-xl transition-colors"
          title="Go to the places editor"
        >
          <MapPin size={15} /> <span className="hidden sm:inline">Places editor</span>
        </a>
        {view === 'list' && (
          <button
            onClick={startNew}
            className="flex items-center gap-2 px-4 py-2 bg-terra hover:bg-terra-dark text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-terra/20"
          >
            <Plus size={16} /> New plan
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
                  placeholder="Search plans…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-stone-900 border border-clay dark:border-stone-700 rounded-xl outline-none focus:ring-1 focus:ring-terra text-sm"
                />
              </div>

              {filteredPlans.length === 0 && (
                <div className="py-24 text-center">
                  <Route className="mx-auto text-stone-300 mb-2" size={48} />
                  <p className="text-sm text-stone-400 italic px-12">
                    {plans.length === 0 ? 'No plans yet. Click “New plan” to create one.' : 'No plans match your search.'}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {filteredPlans.map(plan => {
                  const stepCount = plan.spec.steps?.length ?? 0;
                  return (
                    <div
                      key={plan.spec.id}
                      className="group flex items-center gap-3 p-4 rounded-xl border border-clay dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-terra hover:bg-terra/5 transition-all cursor-pointer"
                      onClick={() => startEdit(plan)}
                    >
                      <div className="bg-terra/10 p-2.5 rounded-lg text-terra shrink-0">
                        <Route size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate leading-tight">{plan.spec.title}</p>
                        <p className="text-[11px] text-stone-400 truncate">
                          {plan.kind} · {stepCount} step(s) · {plan.spec.difficulty}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeletePlan(plan.spec.id, plan.spec.title); }}
                        className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white rounded-md text-stone-300 transition-all shrink-0"
                        title="Delete plan"
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
                <h3 className="font-serif font-bold text-terra">{editingId ? 'Edit Plan' : 'New Plan'}</h3>
                <div className="flex-1" />
                {editingId && (
                  <button
                    onClick={() => onDeletePlan(editingId, draft.spec.title)}
                    className="p-2 hover:bg-red-500 hover:text-white rounded-full transition-colors text-stone-400"
                    title="Delete plan"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <PlanForm
                  draft={draft}
                  onChange={setDraft}
                  placesByRef={placesByRef}
                  allPlaces={allPlaces}
                  people={people}
                  onSubmit={onSavePlan}
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

export default PlansEditorApp;
