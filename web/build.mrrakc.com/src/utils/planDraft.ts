import {
  STEP_TYPES,
  TRANSPORT_MODES,
  DURATION_UNITS,
  PLAN_DIFFICULTIES,
  type Plan,
  type PlanStep,
} from '../data/schema';

// ---------------------------------------------------------------------------
// Draft model — a UI-friendly mirror of a Plan. Every step carries a stable
// `uid` so React keys stay stable and the map can target an "active" step.
// ---------------------------------------------------------------------------

export interface DraftStep {
  uid: string;
  title: string;
  description: string;
  type: (typeof STEP_TYPES)[number];
  placeIds: string[];
  people: { id: string; role: string }[];
  optional: boolean;
  transportEnabled: boolean;
  transport: {
    mode: (typeof TRANSPORT_MODES)[number];
    durationMin: number;
    advice: string;
  };
  subSteps: DraftStep[];
}

export interface PlanDraft {
  kind: string;
  tags: string[];
  spec: {
    id: string;
    title: string;
    description: string;
    pubDate: string;
    estimatedDuration: { value: number; unit: (typeof DURATION_UNITS)[number] };
    difficulty: (typeof PLAN_DIFFICULTIES)[number];
    steps: DraftStep[];
  };
}

let uidCounter = 0;
const uid = () => `s${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

export function newStep(): DraftStep {
  return {
    uid: uid(),
    title: '',
    description: '',
    type: 'waypoint',
    placeIds: [],
    people: [],
    optional: false,
    transportEnabled: false,
    transport: { mode: 'Walking', durationMin: 0, advice: '' },
    subSteps: [],
  };
}

function stepToDraft(step: PlanStep): DraftStep {
  return {
    uid: uid(),
    title: step.title || '',
    description: step.description || '',
    type: step.type || 'waypoint',
    placeIds: step.placeIds ? [...step.placeIds] : [],
    people: step.people ? step.people.map(p => ({ id: p.id, role: p.role })) : [],
    optional: step.optional ?? false,
    transportEnabled: !!step.transportToNext,
    transport: {
      mode: step.transportToNext?.mode || 'Walking',
      durationMin: step.transportToNext?.durationMin ?? 0,
      advice: step.transportToNext?.advice || '',
    },
    subSteps: step.subSteps ? step.subSteps.map(stepToDraft) : [],
  };
}

export function makeEmptyDraft(): PlanDraft {
  return {
    kind: 'plans/itinerary',
    tags: [],
    spec: {
      id: '',
      title: '',
      description: '',
      pubDate: '',
      estimatedDuration: { value: 1, unit: 'days' },
      difficulty: 'easy',
      steps: [newStep()],
    },
  };
}

export function planToDraft(plan: Plan): PlanDraft {
  return {
    kind: plan.kind || 'plans/itinerary',
    tags: plan.metadata?.tags ? [...plan.metadata.tags] : [],
    spec: {
      id: plan.spec.id || '',
      title: plan.spec.title || '',
      description: plan.spec.description || '',
      pubDate: plan.spec.pubDate || '',
      estimatedDuration: {
        value: plan.spec.estimatedDuration?.value ?? 1,
        unit: plan.spec.estimatedDuration?.unit || 'days',
      },
      difficulty: plan.spec.difficulty || 'easy',
      steps: (plan.spec.steps || []).map(stepToDraft),
    },
  };
}

function draftStepToStep(step: DraftStep): PlanStep {
  const out: PlanStep = {
    title: step.title.trim(),
    type: step.type,
  };
  if (step.description.trim()) out.description = step.description.trim();
  if (step.placeIds.length) out.placeIds = step.placeIds;
  const people = step.people.filter(p => p.id.trim());
  if (people.length) out.people = people.map(p => ({ id: p.id.trim(), role: p.role.trim() }));
  if (step.optional) out.optional = true;
  if (step.transportEnabled) {
    out.transportToNext = {
      mode: step.transport.mode,
      durationMin: Number(step.transport.durationMin) || 0,
      ...(step.transport.advice.trim() ? { advice: step.transport.advice.trim() } : {}),
    };
  }
  const subSteps = step.subSteps.map(draftStepToStep);
  if (subSteps.length) out.subSteps = subSteps;
  return out;
}

export function draftToPlan(draft: PlanDraft): Plan {
  return {
    version: 'mrrakc/v0',
    kind: draft.kind,
    ...(draft.tags.length ? { metadata: { tags: draft.tags } } : {}),
    spec: {
      id: draft.spec.id.trim(),
      title: draft.spec.title.trim(),
      ...(draft.spec.description.trim() ? { description: draft.spec.description.trim() } : {}),
      ...(draft.spec.pubDate ? { pubDate: draft.spec.pubDate } : {}),
      estimatedDuration: {
        value: Number(draft.spec.estimatedDuration.value) || 0,
        unit: draft.spec.estimatedDuration.unit,
      },
      difficulty: draft.spec.difficulty,
      steps: draft.spec.steps.map(draftStepToStep),
    },
  } as Plan;
}

// --- Recursive step-tree helpers (operate on uid) --------------------------

export function updateStepByUid(
  steps: DraftStep[],
  targetUid: string,
  updater: (s: DraftStep) => DraftStep,
): DraftStep[] {
  return steps.map(s => {
    if (s.uid === targetUid) return updater(s);
    if (s.subSteps.length) {
      return { ...s, subSteps: updateStepByUid(s.subSteps, targetUid, updater) };
    }
    return s;
  });
}

export function removeStepByUid(steps: DraftStep[], targetUid: string): DraftStep[] {
  return steps
    .filter(s => s.uid !== targetUid)
    .map(s => (s.subSteps.length ? { ...s, subSteps: removeStepByUid(s.subSteps, targetUid) } : s));
}
