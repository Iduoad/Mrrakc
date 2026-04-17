import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import type { FeatureCollection, Geometry, Feature } from 'geojson';

let provincesGeoJSON: FeatureCollection<Geometry> | null = null;

export async function loadProvinces(): Promise<FeatureCollection<Geometry> | null> {
  if (provincesGeoJSON) return provincesGeoJSON;
  try {
    const response = await fetch('/provinces.geojson');
    provincesGeoJSON = await response.json() as FeatureCollection<Geometry>;
    return provincesGeoJSON;
  } catch (error) {
    console.error('Failed to load provinces geojson:', error);
    return null;
  }
}

export function getProvinceForPoint(lng: number, lat: number): string | null {
  if (!provincesGeoJSON) return null;
  
  const pt = point([lng, lat]);
  
  for (const feature of provincesGeoJSON.features) {
    // Cast to any for turf compatibility if necessary, but keep the rest typed
    if (booleanPointInPolygon(pt, feature as Feature<Geometry>)) {
      // Extract the slug from "province/slug" or use the raw id
      const props = feature.properties || {};
      const fullId = (props.province_id || props.id || '') as string;
      return fullId.replace('province/', '');
    }
  }
  
  return null;
}
