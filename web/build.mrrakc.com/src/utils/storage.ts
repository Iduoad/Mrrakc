import type { Place } from '../data/schema';

const STORAGE_KEY = 'mrrakc-builder-places-v1';
const ACCESS_CODE_KEY = 'mrrakc-builder-access-code';

export interface StoredData {
  places: Place[];
  lastSaved: string;
  version: number;
}

export const StorageManager = {
  savePlaces(places: Place[]) {
    try {
      const data: StoredData = {
        places,
        lastSaved: new Date().toISOString(),
        version: 1
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  },

  loadPlaces(): Place[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      
      const data: StoredData = JSON.parse(raw);
      // Here we can add migration logic if version changes
      return data.places || [];
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      return [];
    }
  },

  saveAccessCode(code: string) {
    localStorage.setItem(ACCESS_CODE_KEY, code);
  },

  loadAccessCode(): string {
    return localStorage.getItem(ACCESS_CODE_KEY) || '';
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
};
