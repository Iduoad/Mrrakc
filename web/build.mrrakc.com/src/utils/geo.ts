import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

let provincesGeoJSON: any = null;

export async function loadProvinces() {
  if (provincesGeoJSON) return provincesGeoJSON;
  try {
    const response = await fetch('/provinces.geojson');
    provincesGeoJSON = await response.json();
    return provincesGeoJSON;
  } catch (error) {
    console.error('Failed to load provinces geojson:', error);
    return null;
  }
}

export function getProvinceForPoint(lng: number, lat: number) {
  if (!provincesGeoJSON) return null;
  
  const pt = point([lng, lat]);
  
  for (const feature of provincesGeoJSON.features) {
    if (booleanPointInPolygon(pt, feature)) {
      // Extract the slug from "province/slug" or use the raw id
      const fullId = feature.properties.province_id || feature.properties.id || '';
      return fullId.replace('province/', '');
    }
  }
  
  return null;
}
