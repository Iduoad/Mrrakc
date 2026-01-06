import os
import json

DIRS = [
    'data/places/sale',
    'data/places/oujda-angad',
    'data/places/tangier-assilah'
]

def fix_coords():
    for d in DIRS:
        if not os.path.exists(d):
            print(f"Directory not found: {d}")
            continue
            
        print(f"Processing {d}...")
        for filename in os.listdir(d):
            if not filename.endswith('.json'):
                continue
                
            filepath = os.path.join(d, filename)
            with open(filepath, 'r') as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError:
                    print(f"Error decoding {filepath}")
                    continue
            
            # Check if spec.location exists
            if 'spec' not in data or 'location' not in data['spec']:
                continue
                
            loc = data['spec']['location']
            lat = loc.get('latitude')
            lon = loc.get('longitude')
            
            if lat is None or lon is None:
                continue
                
            # Logic: If Lat is Positive (e.g. 34) and Lon is Negative (e.g. -6), 
            # it is "Correct" data, but we want "Swapped" data (Lat=-6, Lon=34) 
            # to match the codebase convention.
            
            if lat > 0 and lon < 0:
                print(f"Swapping coords for {filename}: Lat {lat}, Lon {lon} -> Lat {lon}, Lon {lat}")
                loc['latitude'] = lon
                loc['longitude'] = lat
                
                with open(filepath, 'w') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                    f.write('\n') # Add newline at end of file

if __name__ == '__main__':
    fix_coords()
