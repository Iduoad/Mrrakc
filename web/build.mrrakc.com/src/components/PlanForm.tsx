import React from 'react';
import {
  PlanSchema,
  STEP_TYPES,
  TRANSPORT_MODES,
  DURATION_UNITS,
  PLAN_DIFFICULTIES,
  PLAN_KINDS,
  type Plan,
} from '../data/schema';
import type { PlaceRef, PersonRef } from '../utils/editorApi';
import {
  type DraftStep,
  type PlanDraft,
  newStep,
  draftToPlan,
  updateStepByUid,
  removeStepByUid,
} from '../utils/planDraft';
import { FuzzyPicker } from './FuzzyPicker';
import {
  Plus, Trash2, MapPin, ChevronDown, ChevronRight, Info, Route,
  GripVertical, Users, X, CornerDownRight, Bus,
} from 'lucide-react';

const selectCls =
  'w-full px-3 py-2 rounded-lg border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-xs outline-none focus:ring-1 focus:ring-terra';
const inputCls = selectCls;

const STEP_TYPE_COLORS: Record<string, string> = {
  waypoint: 'bg-blue-500',
  activity: 'bg-emerald-500',
  break: 'bg-amber-500',
  overnight: 'bg-violet-500',
};

interface StepEditorProps {
  step: DraftStep;
  depth: number;
  placesByRef: Map<string, PlaceRef>;
  allPlaces: PlaceRef[];
  people: PersonRef[];
  onChange: (uid: string, updater: (s: DraftStep) => DraftStep) => void;
  onRemove: (uid: string) => void;
}

const StepEditor: React.FC<StepEditorProps> = ({
  step, depth, placesByRef, allPlaces, people, onChange, onRemove,
}) => {
  const [open, setOpen] = React.useState(true);
  const excludePlaces = new Set(step.placeIds);
  const excludePeople = new Set(step.people.map(p => p.id));

  return (
    <div className="rounded-xl border border-clay dark:border-stone-800 bg-white dark:bg-stone-900">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <GripVertical size={14} className="text-stone-300 shrink-0" />
        <span className={`w-2 h-2 rounded-full shrink-0 ${STEP_TYPE_COLORS[step.type] || 'bg-stone-400'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate">
            {step.title || <span className="text-stone-400 italic font-normal">Untitled step</span>}
          </p>
          <p className="text-[10px] text-stone-400 truncate">
            {step.type}
            {step.optional ? ' · optional' : ''}
            {step.placeIds.length ? ` · ${step.placeIds.length} place(s)` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(step.uid); }}
          className="p-1 text-stone-300 hover:text-red-500 shrink-0"
          title="Remove step"
        >
          <Trash2 size={14} />
        </button>
        {open ? <ChevronDown size={14} className="text-stone-400 shrink-0" /> : <ChevronRight size={14} className="text-stone-400 shrink-0" />}
      </div>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-clay/60 dark:border-stone-800 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] uppercase font-bold text-stone-500">Title</label>
              <input
                value={step.title}
                onChange={(e) => onChange(step.uid, s => ({ ...s, title: e.target.value }))}
                className={inputCls}
                placeholder="e.g. Journey from Marrakech to Imlil"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-stone-500">Type</label>
              <select
                value={step.type}
                onChange={(e) => onChange(step.uid, s => ({ ...s, type: e.target.value as DraftStep['type'] }))}
                className={selectCls}
              >
                {STEP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={step.optional}
                  onChange={(e) => onChange(step.uid, s => ({ ...s, optional: e.target.checked }))}
                  className="w-4 h-4 accent-terra"
                />
                Optional
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-stone-500">Description</label>
            <textarea
              value={step.description}
              onChange={(e) => onChange(step.uid, s => ({ ...s, description: e.target.value }))}
              rows={2}
              className={inputCls}
              placeholder="What happens in this step…"
            />
          </div>

          {/* Places */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-stone-500 flex items-center gap-1">
              <MapPin size={12} /> Places
            </label>
            {step.placeIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {step.placeIds.map(ref => {
                  const place = placesByRef.get(ref);
                  return (
                    <span
                      key={ref}
                      className="inline-flex items-center gap-1 bg-sand dark:bg-stone-800 border border-clay dark:border-stone-700 rounded-full pl-2.5 pr-1 py-1 text-[11px]"
                      title={ref}
                    >
                      <span className="truncate max-w-[160px]">{place?.spec.name || ref}</span>
                      <button
                        type="button"
                        onClick={() => onChange(step.uid, s => ({ ...s, placeIds: s.placeIds.filter(r => r !== ref) }))}
                        className="text-stone-400 hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <FuzzyPicker<PlaceRef>
              items={allPlaces}
              keyOf={(p) => `${p.spec.name} ${p.spec.location.province.replace('province/', '')}`}
              idOf={(p) => p.ref}
              excludeIds={excludePlaces}
              onSelect={(p) => onChange(step.uid, s => ({ ...s, placeIds: [...s.placeIds, p.ref] }))}
              placeholder="Search places to add…"
              renderItem={(p) => (
                <div className="flex flex-col">
                  <span className="font-medium">{p.spec.name}</span>
                  <span className="text-[10px] text-stone-400">{p.kind} · {p.spec.location.province.replace('province/', '')}</span>
                </div>
              )}
            />
          </div>

          {/* People */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-stone-500 flex items-center gap-1">
              <Users size={12} /> People
            </label>
            {step.people.map((person, pi) => (
              <div key={person.id + pi} className="flex items-center gap-1.5">
                <span className="flex-1 truncate text-[11px] bg-sand dark:bg-stone-800 border border-clay dark:border-stone-700 rounded-lg px-2 py-1.5" title={person.id}>
                  {person.id.replace('people/', '')}
                </span>
                <input
                  value={person.role}
                  onChange={(e) => onChange(step.uid, s => ({
                    ...s,
                    people: s.people.map((pp, j) => j === pi ? { ...pp, role: e.target.value } : pp),
                  }))}
                  placeholder="Role"
                  className="w-28 px-2 py-1.5 rounded-lg border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-[11px]"
                />
                <button
                  type="button"
                  onClick={() => onChange(step.uid, s => ({ ...s, people: s.people.filter((_, j) => j !== pi) }))}
                  className="p-1 text-stone-300 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <FuzzyPicker<PersonRef>
              items={people}
              keyOf={(p) => p.name}
              idOf={(p) => `people/${p.id}`}
              excludeIds={excludePeople}
              onSelect={(p) => onChange(step.uid, s => ({ ...s, people: [...s.people, { id: `people/${p.id}`, role: '' }] }))}
              placeholder="Search people to add…"
              renderItem={(p) => (
                <div className="flex flex-col">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-[10px] text-stone-400">people/{p.id}</span>
                </div>
              )}
            />
          </div>

          {/* Transport to next */}
          <div className="space-y-2 rounded-lg border border-clay/60 dark:border-stone-800 p-2.5 bg-sand/30 dark:bg-stone-950/20">
            <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold uppercase text-stone-500">
              <input
                type="checkbox"
                checked={step.transportEnabled}
                onChange={(e) => onChange(step.uid, s => ({ ...s, transportEnabled: e.target.checked }))}
                className="w-4 h-4 accent-terra"
              />
              <Bus size={13} /> Transport to next step
            </label>
            {step.transportEnabled && (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-stone-500">Mode</label>
                    <select
                      value={step.transport.mode}
                      onChange={(e) => onChange(step.uid, s => ({ ...s, transport: { ...s.transport, mode: e.target.value as DraftStep['transport']['mode'] } }))}
                      className={selectCls}
                    >
                      {TRANSPORT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-stone-500">Duration (min)</label>
                    <input
                      type="number"
                      min={0}
                      value={step.transport.durationMin}
                      onChange={(e) => onChange(step.uid, s => ({ ...s, transport: { ...s.transport, durationMin: Number(e.target.value) } }))}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-stone-500">Advice</label>
                  <input
                    value={step.transport.advice}
                    onChange={(e) => onChange(step.uid, s => ({ ...s, transport: { ...s.transport, advice: e.target.value } }))}
                    className={inputCls}
                    placeholder="Tips for this leg…"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sub-steps */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold text-stone-500 flex items-center gap-1">
                <CornerDownRight size={12} /> Sub-steps
              </label>
              <button
                type="button"
                onClick={() => onChange(step.uid, s => ({ ...s, subSteps: [...s.subSteps, newStep()] }))}
                className="text-terra hover:text-terra-dark flex items-center gap-1 text-[10px] font-bold bg-terra/10 px-2 py-1 rounded-md"
              >
                <Plus size={11} /> Add
              </button>
            </div>
            {step.subSteps.length > 0 && (
              <div className={`space-y-2 ${depth < 3 ? 'pl-3 border-l-2 border-clay dark:border-stone-800' : ''}`}>
                {step.subSteps.map((sub) => (
                  <StepEditor
                    key={sub.uid}
                    step={sub}
                    depth={depth + 1}
                    placesByRef={placesByRef}
                    allPlaces={allPlaces}
                    people={people}
                    onChange={onChange}
                    onRemove={onRemove}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface Props {
  draft: PlanDraft;
  onChange: (draft: PlanDraft) => void;
  placesByRef: Map<string, PlaceRef>;
  allPlaces: PlaceRef[];
  people: PersonRef[];
  onSubmit: (plan: Plan) => void;
  onCancel: () => void;
  onError: (message: string) => void;
  isEditing: boolean;
}

const PlanForm: React.FC<Props> = ({
  draft, onChange, placesByRef, allPlaces, people, onSubmit, onCancel, onError, isEditing,
}) => {
  // Auto-derive slug from title while creating.
  React.useEffect(() => {
    if (!isEditing && draft.spec.title && !draft.spec.id) {
      const slug = draft.spec.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      if (slug) onChange({ ...draft, spec: { ...draft.spec, id: slug } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.spec.title]);

  const setSpec = (patch: Partial<PlanDraft['spec']>) =>
    onChange({ ...draft, spec: { ...draft.spec, ...patch } });

  const handleStepChange = (targetUid: string, updater: (s: DraftStep) => DraftStep) =>
    setSpec({ steps: updateStepByUid(draft.spec.steps, targetUid, updater) });

  const handleStepRemove = (targetUid: string) =>
    setSpec({ steps: removeStepByUid(draft.spec.steps, targetUid) });

  const addStep = () => setSpec({ steps: [...draft.spec.steps, newStep()] });

  const submit = () => {
    const plan = draftToPlan(draft);
    const result = PlanSchema.safeParse(plan);
    if (!result.success) {
      console.error('Plan validation failed:', result.error);
      const first = result.error.issues[0];
      onError(first ? `${first.path.join('.') || 'plan'}: ${first.message}` : 'Please check the highlighted fields.');
      return;
    }
    onSubmit(result.data);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-stone-900 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Basics */}
        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-charcoal-light dark:text-stone-400 flex items-center gap-2">
            <Info size={14} /> Plan details
          </h4>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-stone-500">Title</label>
            <input value={draft.spec.title} onChange={(e) => setSpec({ title: e.target.value })} className={inputCls} placeholder="e.g. Toubkal Summit Weekend Trek" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-stone-500">ID (slug)</label>
            <input value={draft.spec.id} onChange={(e) => setSpec({ id: e.target.value })} className={`${inputCls} font-mono`} placeholder="toubkal-summit-trek" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-stone-500">Kind</label>
              <input list="plan-kinds" value={draft.kind} onChange={(e) => onChange({ ...draft, kind: e.target.value })} className={`${inputCls} font-mono`} placeholder="plans/itinerary" />
              <datalist id="plan-kinds">
                {PLAN_KINDS.map(k => <option key={k} value={k} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-stone-500">Difficulty</label>
              <select value={draft.spec.difficulty} onChange={(e) => setSpec({ difficulty: e.target.value as PlanDraft['spec']['difficulty'] })} className={selectCls}>
                {PLAN_DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-stone-500">Description</label>
            <textarea value={draft.spec.description} onChange={(e) => setSpec({ description: e.target.value })} rows={3} className={inputCls} placeholder="What is this itinerary about…" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-stone-500">Duration</label>
              <input type="number" min={0} step="any" value={draft.spec.estimatedDuration.value} onChange={(e) => setSpec({ estimatedDuration: { ...draft.spec.estimatedDuration, value: Number(e.target.value) } })} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-stone-500">Unit</label>
              <select value={draft.spec.estimatedDuration.unit} onChange={(e) => setSpec({ estimatedDuration: { ...draft.spec.estimatedDuration, unit: e.target.value as PlanDraft['spec']['estimatedDuration']['unit'] } })} className={selectCls}>
                {DURATION_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-stone-500">Pub date</label>
              <input type="date" value={draft.spec.pubDate} onChange={(e) => setSpec({ pubDate: e.target.value })} className={inputCls} />
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-widest text-charcoal-light dark:text-stone-400 flex items-center gap-2">
              <Route size={14} /> Steps ({draft.spec.steps.length})
            </h4>
            <button type="button" onClick={addStep} className="text-terra hover:text-terra-dark flex items-center gap-1 text-[10px] font-bold bg-terra/10 px-2 py-1 rounded-md">
              <Plus size={12} /> Add step
            </button>
          </div>
          <p className="text-[10px] text-stone-400 italic">
            Use each step's search box to add places and people by name.
          </p>
          <div className="space-y-2">
            {draft.spec.steps.map((step) => (
              <StepEditor
                key={step.uid}
                step={step}
                depth={0}
                placesByRef={placesByRef}
                allPlaces={allPlaces}
                people={people}
                onChange={handleStepChange}
                onRemove={handleStepRemove}
              />
            ))}
            {draft.spec.steps.length === 0 && (
              <p className="text-xs text-stone-400 italic py-6 text-center">No steps yet. Add one to get started.</p>
            )}
          </div>
        </section>
      </div>

      <div className="shrink-0 p-5 border-t border-clay dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 border border-clay dark:border-stone-700 rounded-lg hover:bg-clay/20 transition-colors text-sm font-bold">
          Cancel
        </button>
        <button type="button" onClick={submit} className="flex-[2] px-4 py-3 bg-terra hover:bg-terra-dark text-white font-bold rounded-lg transition-colors shadow-lg shadow-terra/20 text-sm">
          {isEditing ? 'Save Plan' : 'Create Plan'}
        </button>
      </div>
    </div>
  );
};

export default PlanForm;
