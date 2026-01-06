import os
import json
import re

PLACES_DIR = 'data/places'

def fix_place_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            print(f"Error decoding {file_path}")
            return

    changed = False
    
    # Fix 1: Enforce User Preference: Latitude Negative (South), Longitude Positive (East)
    # User Request: "Longitude should be around 30 and latitude around -7"
    if 'spec' in data and 'location' in data['spec']:
        loc = data['spec']['location']
        if 'latitude' in loc and 'longitude' in loc:
            lat = loc['latitude']
            lon = loc['longitude']
            
            # If Lat is Positive (North) and Lon is Negative (West) -> This is "Correct" for Morocco
            # BUT User wants Lat Negative, Lon Positive.
            
            if lat > 0 and lon < 0:
                print(f"Swapping to User Preference for {file_path}: Lat {lat}, Lon {lon} -> Lat {lon}, Lon {lat}")
                # Swap values
                new_lat = lon
                new_lon = lat
                
                # Update dict with new values AND order (Lon first)
                new_loc = {
                    'longitude': new_lon,
                    'latitude': new_lat
                }
                if 'province' in loc:
                    new_loc['province'] = loc['province']
                
                data['spec']['location'] = new_loc
                changed = True
                
            elif lat < 0 and lon > 0:
                # Already matches user preference (Lat Negative, Lon Positive)
                # Just ensure order is correct (Lon first)
                new_loc = {
                    'longitude': lon,
                    'latitude': lat
                }
                if 'province' in loc:
                    new_loc['province'] = loc['province']
                
                if list(loc.keys()) != list(new_loc.keys()):
                    data['spec']['location'] = new_loc
                    changed = True
            
    # Fix 2: Remove "province: *" from description
    if 'spec' in data and 'description' in data['spec']:
        desc = data['spec']['description']
        # Regex to remove "province: ..."
        # Case insensitive, remove until end of line or dot
        new_desc = re.sub(r'province:\s*[^.]+(\.|$)', '', desc, flags=re.IGNORECASE).strip()
        
        if not new_desc:
            new_desc = "No description available."
            
        if new_desc != desc:
            data['spec']['description'] = new_desc
            changed = True

    # Fix 3: Update Kind for Gorges -> nature/canyon
    if 'kind' in data:
        kind = data['kind']
        name = data['spec'].get('name', '').lower()
        if 'gorge' in name and kind != 'nature/canyon':
            data['kind'] = 'nature/canyon'
            # Also update spec.kind if it exists (it's not in the schema usually but good to check)
            if 'spec' in data and 'kind' in data['spec']:
                 data['spec']['kind'] = 'nature/canyon'
            changed = True

    # Fix 4: Update Kind for Sources/Ain -> nature/water-source
    if 'kind' in data:
        kind = data['kind']
        name = data['spec'].get('name', '').lower()
        if ('source' in name or 'ain ' in name or ' ain' in name) and kind != 'nature/water-source':
            data['kind'] = 'nature/water-source'
            if 'spec' in data and 'kind' in data['spec']:
                 data['spec']['kind'] = 'nature/water-source'
            changed = True

    if changed:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Fixed {file_path}")

def main():
    # Walk through all json files in data/places
    for root, dirs, files in os.walk(PLACES_DIR):
        for file in files:
            if file.endswith(".json"):
                fix_place_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
