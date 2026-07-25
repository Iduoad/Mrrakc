import type { Place, Plan } from '../data/schema';

// Thin client for the dev-only filesystem API (see vite-plugin-places-fs.ts).

export interface ProvinceInfo {
  id: string;
  count: number;
}

export interface LoadedPlace {
  place: Place;
  file: string;
}

// Lightweight place record returned by /api/places/all — just what the plan
// editor needs to render a marker and reference the place.
export interface PlaceRef {
  ref: string; // places/<province>/<id>
  kind: string;
  spec: {
    name: string;
    id: string;
    location: { latitude: number; longitude: number; province: string };
  };
}

export interface LoadedPlan {
  plan: Plan;
  file: string;
}

async function json<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data as T;
}

export async function fetchProvinces(): Promise<ProvinceInfo[]> {
  return json(await fetch('/api/provinces'));
}

export async function fetchPlaces(province: string): Promise<{
  places: LoadedPlace[];
  errors: { file: string; error: string }[];
}> {
  return json(await fetch(`/api/places?province=${encodeURIComponent(province)}`));
}

export async function savePlace(
  place: Place,
  prev?: { province: string; id: string },
): Promise<void> {
  const province = place.spec.location.province.replace('province/', '');
  const id = place.spec.id;
  await json(
    await fetch('/api/places', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ province, id, place, prev }),
    }),
  );
}

export async function deletePlace(province: string, id: string): Promise<void> {
  await json(
    await fetch(
      `/api/places?province=${encodeURIComponent(province)}&id=${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ),
  );
}

// --- Plans -----------------------------------------------------------------

export async function fetchAllPlaces(): Promise<{
  places: PlaceRef[];
  errors: { file: string; error: string }[];
}> {
  return json(await fetch('/api/places/all'));
}

export interface PersonRef {
  id: string;
  name: string;
}

export async function fetchPeople(): Promise<{ people: PersonRef[] }> {
  return json(await fetch('/api/people'));
}

export async function fetchPlans(): Promise<{
  plans: LoadedPlan[];
  errors: { file: string; error: string }[];
}> {
  return json(await fetch('/api/plans'));
}

export async function savePlan(plan: Plan, prevId?: string): Promise<void> {
  await json(
    await fetch('/api/plans', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: plan.spec.id, plan, prevId }),
    }),
  );
}

export async function deletePlan(id: string): Promise<void> {
  await json(
    await fetch(`/api/plans?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  );
}
