import JSZip from 'jszip';
import type { Place } from '../data/schema';

export async function exportToZip(places: Place[]) {
  const zip = new JSZip();
  
  for (const place of places) {
    // Determine the province ID from the location field (it's stored as province/id)
    const provinceId = place.spec.location.province.replace('province/', '');
    const placeId = place.spec.id;
    
    // Strip internal metadata for export
    const exportData: Partial<Place> & { _internal?: unknown } = { ...place };
    delete exportData._internal;
    
    const filePath = `places/${provinceId}/${placeId}.json`;
    zip.file(filePath, JSON.stringify(exportData, null, 2));
  }
  
  const content = await zip.generateAsync({ type: 'blob' });
  
  // Trigger download
  const url = window.URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mrrakc-places-${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
