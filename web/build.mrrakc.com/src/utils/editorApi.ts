import type { Place } from '../data/schema';

// Thin client for the dev-only filesystem API (see vite-plugin-places-fs.ts).

export interface ProvinceInfo {
  id: string;
  count: number;
}

export interface LoadedPlace {
  place: Place;
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
