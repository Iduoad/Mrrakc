import type { Event, Place } from '../data/schema';

// Client for the local filesystem API (see server/fs-api.ts).

async function json<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data as T;
}

// --- Places ----------------------------------------------------------------

export interface ProvinceInfo {
  id: string;
  count: number;
}

export interface LoadedPlace {
  place: Place;
  file: string;
}

export interface FileError {
  file: string;
  error: string;
}

export async function fetchPlaceProvinces(): Promise<ProvinceInfo[]> {
  const { provinces } = await json<{ provinces: ProvinceInfo[] }>(
    await fetch('/api/places/provinces'),
  );
  return provinces;
}

export async function fetchPlaces(province: string): Promise<{
  places: LoadedPlace[];
  errors: FileError[];
}> {
  return json(await fetch(`/api/places?province=${encodeURIComponent(province)}`));
}

export async function savePlace(
  place: Place,
  prev?: { province: string; id: string },
): Promise<void> {
  await json(
    await fetch('/api/places', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        province: place.spec.location.province.replace('province/', ''),
        id: place.spec.id,
        place,
        prev,
      }),
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

// --- Events ----------------------------------------------------------------

export interface LoadedEvent {
  event: Event;
  file: string;
}

export async function fetchEvents(): Promise<{
  events: LoadedEvent[];
  errors: FileError[];
}> {
  return json(await fetch('/api/events'));
}

export async function saveEvent(event: Event): Promise<void> {
  await json(
    await fetch('/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: event.spec.id, event }),
    }),
  );
}

// --- Event source drafts ---------------------------------------------------

export interface LoadedDraft<T> {
  draft: T;
  file: string;
}

export async function fetchEventDrafts<T>(): Promise<{
  drafts: LoadedDraft<T>[];
  errors: FileError[];
}> {
  return json(await fetch('/api/event-drafts'));
}

export async function saveEventDraft(
  id: string,
  draft: unknown,
  prevId?: string,
): Promise<void> {
  await json(
    await fetch('/api/event-drafts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, draft, prevId }),
    }),
  );
}

export async function deleteEventDraft(id: string): Promise<void> {
  await json(
    await fetch(`/api/event-drafts?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  );
}

// --- Review state ----------------------------------------------------------

export async function fetchReviewState<T>(): Promise<T> {
  return json(await fetch('/api/review-state'));
}

export async function saveReviewState(state: unknown): Promise<void> {
  await json(
    await fetch('/api/review-state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }),
  );
}
