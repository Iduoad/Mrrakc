import xml.etree.ElementTree as ET
import json
import os
import re
import re
import sys
import unicodedata
import glob

# Configuration
KML_FILES = ['.tmp/mountains.kml']
OUTPUT_DIR = 'data/places' # Will be appended with province name dynamically
SCHEMA_FILE = '../schema/places.json'

# Namespace map for KML
NS = {'kml': 'http://www.opengis.net/kml/2.2'}

# Mapping from KML Folder names to 'kind' enum
KIND_MAPPING = {
    "Cafés and Restaurants": "food/restaurant",
    "Mosques & Zaouias": "religion/mosque",
    "Museums & Civil architecture": "culture/museum",
    "Nature & Hiking": "nature/park",
    "Squares & Parks": "urban/square",
    "Churches and Synagogues": "religion/church",
    "Economy and lifestyle": "shopping/market",
    "Historical Landmarks": "history/historic-site",
    "Lakes": "nature/lake",
    "Rivers": "nature/river",
    "Dams": "nature/dam",
    "Beaches": "nature/beach",
    "Waterfalls": "nature/waterfall",
}

# Specific overrides for places that don't fit the folder mapping or need more specificity
NAME_TO_KIND_OVERRIDE = {
    "Ain Asserdoun Park": "nature/park",
    "Ajoujar Waterfalls": "nature/water-source",
    "Almoravid Minaret": "history/monument",
    "Attarine Square": "urban/square",
    "Babouch (Moroccan Snails)": "food/street-food",
    "Biranzarane Square": "urban/square",
    "Castle of Béni Mellal": "history/kasbah",
    "Black Sultane's Castle": "history/kasbah",
    "Cultural Heritage Interpretation Center": "culture/museum",
    "Fechtala Historical City": "history/historic-site",
    "Freedom Square": "urban/square",
    "Great Kasbah Mosque": "religion/mosque",
    "Green March Square": "urban/square",
    "Jewish Cemetery": "religion/jewish-site",
    "Laghdira Al Hamra Square": "urban/square",
    "Mouaalaja Sandwishes": "food/street-food",
    "Moulay Abdelkader Mosque": "religion/mosque",
    "Moulay Slimane Mosque": "religion/mosque",
    "Mount Tassemi": "nature/mountain",
    "Municipal Garden": "nature/park",
    "Olympique d'or Garden": "nature/park",
    "Oushrah Park": "nature/park",
    "Resistance Square": "urban/square",
    "Sidi Ahmed Ibn Kacem Saoumai Mosque": "religion/mosque",
    "Spring of Coffee": "food/cafe",
    "The Great Mosque": "religion/mosque",
    "Zaouiya Ahmed Tadli Saoumai": "religion/zaouiya",
    "Zaouiya Jazouliya": "religion/zaouiya",
    "Zaouiya Jazouliya - Fechtala": "religion/zaouiya",
    "Zaouiya Kadiriya Boudchichia": "religion/zaouiya",
    "Zaouiya Kettaniya": "religion/zaouiya",
    "Zaouiya Tijaniya": "religion/zaouiya",
}

def sanitize_id(name):
    # Remove special characters and spaces, convert to lowercase kebab-case
    s = name.lower()
    # Remove star emoji and other non-alphanumeric chars (except space and dash)
    s = re.sub(r'[⭐👑]', '', s) 
    s = re.sub(r'[^a-z0-9\s-]', '', s)
    s = re.sub(r'\s+', '-', s)
    return s.strip('-')

def get_kind(folder_name, place_name):
    # Remove star for matching
    clean_name = place_name.replace('⭐', '').replace('👑', '').strip()
    
    # Check specific overrides first
    if clean_name in NAME_TO_KIND_OVERRIDE:
        return NAME_TO_KIND_OVERRIDE[clean_name]
    
    # Check folder mapping
    if folder_name in KIND_MAPPING:
        # Refine based on name if needed
        if folder_name == "Mosques & Zaouias":
            if "Zaouiya" in clean_name or "Zaouia" in clean_name:
                return "religion/zaouiya"
            if "Mausoleum" in clean_name:
                return "religion/mausoleum"
        if folder_name == "Churches and Synagogues":
            if "Synagogue" in clean_name:
                return "religion/synagogue"
        return KIND_MAPPING[folder_name]
        
    # Heuristics based on name
    lower_name = clean_name.lower()
    if 'ksar' in lower_name:
        return 'architecture/ksar'
    if 'kasbah' in lower_name:
        return 'architecture/kasbah' # Updated to architecture/kasbah based on user request
    if 'mosque' in lower_name:
        return 'religion/mosque'
    if 'synagogue' in lower_name:
        return 'religion/synagogue'
    if 'church' in lower_name or 'cathedral' in lower_name:
        return 'religion/church'
    if 'museum' in lower_name:
        return 'culture/museum'
    if 'gallery' in lower_name:
        return 'culture/art-gallery'
    if 'park' in lower_name:
        return 'nature/park'
    if 'garden' in lower_name:
        return 'nature/park'
    if 'forest' in lower_name:
        return 'nature/forest'
    if 'square' in lower_name or 'place ' in lower_name:
        return 'urban/square'
    if 'market' in lower_name or 'souk' in lower_name:
        return 'shopping/market'
    if 'mall' in lower_name:
        return 'shopping/mall'
    if 'school' in lower_name or 'college' in lower_name or 'lycee' in lower_name:
        return 'architecture/school'
    if 'hotel' in lower_name:
        return 'architecture/hotel'
    if 'restaurant' in lower_name:
        return 'food/restaurant'
    if 'cafe' in lower_name or 'café' in lower_name:
        return 'food/cafe'
    if 'bakery' in lower_name or 'boulangerie' in lower_name or 'patisserie' in lower_name:
        return 'food/bakery'
    if 'pharmacy' in lower_name:
        return 'architecture/pharmacy'
    if 'hospital' in lower_name or 'clinique' in lower_name:
        return 'architecture/hospital'
    if 'cinema' in lower_name:
        return 'entertainment/cinema'
    if 'theatre' in lower_name:
        return 'entertainment/theatre'
    if 'gate' in lower_name or 'bab ' in lower_name.lower():
        return 'history/gate'
    if 'bastion' in lower_name or 'borj' in lower_name or 'tower' in lower_name or 'fort' in lower_name:
        return 'history/bastion'
    if 'tannery' in lower_name:
        return 'culture/tannery'
    if 'mausoleum' in lower_name:
        return 'religion/mausoleum'
    if 'zaouiya' in lower_name or 'zaouia' in lower_name:
        return 'religion/zaouiya'
    if 'hammam' in lower_name:
        return 'leisure/hammam'
    if 'fountain' in lower_name:
        return 'urban/fountain'
    if 'viewpoint' in lower_name:
        return 'urban/viewpoint'
    if 'gorge' in lower_name:
        return 'nature/canyon'
    if 'source' in lower_name or 'ain ' in lower_name or ' ain' in lower_name:
        return 'nature/water-source'
    
    if 'dam' in lower_name:
        return 'nature/dam'
    if 'lake' in lower_name:
        return 'nature/lake'
    if 'river' in lower_name or 'oued' in lower_name:
        return 'nature/river'
    if 'beach' in lower_name or 'plage' in lower_name:
        return 'nature/beach'
    if 'waterfall' in lower_name or 'cascade' in lower_name:
        return 'nature/waterfall'

    return 'urban/landmark' # Default fallback

    return 'urban/landmark' # Default fallback

def get_valid_provinces():
    # Load all valid province IDs from data/provinces/*.json
    valid_provinces = set()
    files = glob.glob('data/provinces/*.json')
    for f in files:
        basename = os.path.basename(f)
        province_id = basename.replace('.json', '')
        valid_provinces.add(province_id)
    return valid_provinces

def normalize_province_name(name, valid_provinces):
    # 1. Strip accents
    nfkd_form = unicodedata.normalize('NFKD', name)
    name_ascii = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    
    # 2. Lowercase and basic cleanup
    s = name_ascii.lower()
    
    # 3. Handle prefixes and suffixes
    s = s.replace('province de ', '').replace("province d'", '')
    s = s.replace('prefecture de ', '').replace("prefecture d'", '')
    s = s.replace('prefecture of ', '').replace('province of ', '')
    
    # Handle suffixes (e.g. "Taroudant Province")
    if s.endswith(' province'):
        s = s[:-9]
    if s.endswith(' prefecture'):
        s = s[:-11]
    
    # 4. Sanitize to ID format
    s = re.sub(r'[^a-z0-9\s-]', '', s)
    s = re.sub(r'\s+', '-', s).strip('-')
    
    # 5. Handle specific mismatches manually if needed
    # e.g. "sal" -> "sale" (if accents were stripped weirdly or if original was just "Salé")
    # Actually "Salé" -> "Sale" via ascii normalization.
    # "M'diq-Fnideq" -> "mdiq-fnideq"
    
    # Check if this ID exists in valid_provinces
    if s in valid_provinces:
        return s
        
    # Try to find close matches or common variations
    if s == "sale": return "sale" # Should match
    if s == "m-diq-fnideq": return "m-diq-fnideq"
    if s == "tangier-assilah": return "tangier-assilah"
    
    # If the geojson has "prefecture-of-sal" -> "sale"
    if s == "sal": return "sale" 
    
    # Check if s is a substring of a valid province (dangerous but maybe useful?)
    # Or if a valid province is a substring of s?
    
    return s

def load_provinces(geojson_path):
    print(f"Loading provinces from {geojson_path}...")
    valid_provinces = get_valid_provinces()
    print(f"Found {len(valid_provinces)} valid provinces in data/provinces/")
    
    with open(geojson_path, 'r') as f:
        data = json.load(f)
    
    provinces = []
    for feature in data['features']:
        props = feature['properties']
        full_name = props.get('shapeName', '')
        
        province_id = normalize_province_name(full_name, valid_provinces)
        
        # If not in valid list, log warning but keep it (or map to unknown?)
        if province_id not in valid_provinces:
            print(f"Warning: GeoJSON province '{full_name}' -> '{province_id}' not found in valid provinces list.")
        
        geometry = feature['geometry']
        polygons = []
        
        if geometry['type'] == 'Polygon':
            polygons.append(geometry['coordinates'][0]) # Outer ring
        elif geometry['type'] == 'MultiPolygon':
            for poly in geometry['coordinates']:
                polygons.append(poly[0]) # Outer ring of each polygon
        
        provinces.append({
            'id': f"province/{province_id}",
            'name': full_name,
            'polygons': polygons
        })
    
    print(f"Loaded {len(provinces)} provinces from GeoJSON.")
    return provinces

def is_point_in_polygon(x, y, polygon):
    # Ray casting algorithm
    # x: longitude, y: latitude
    n = len(polygon)
    inside = False
    p1x, p1y = polygon[0]
    for i in range(n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def find_province(lat, lon, provinces):
    # lat, lon are floats
    # GeoJSON coordinates are usually [lon, lat]
    
    for province in provinces:
        for polygon in province['polygons']:
            if is_point_in_polygon(lon, lat, polygon):
                return province['id']
    
    return None

def parse_kml(kml_file, provinces=None):
    tree = ET.parse(kml_file)
    root = tree.getroot()
    doc = root.find('kml:Document', NS)
    
    places = []
    
    # Iterate over Folders
    for folder in doc.findall('kml:Folder', NS):
        folder_name = folder.find('kml:name', NS).text
        
        # Iterate over Placemarks in Folder
        for placemark in folder.findall('kml:Placemark', NS):
            name = placemark.find('kml:name', NS).text
            if not name:
                continue
            name = name.strip()
            
            # Determine if this is a mountain file
            is_mountain = 'mountains' in kml_file
            
            # Remove star for name processing but keep it in description or just clean it?
            # Let's clean it for the name field
            clean_name = name.replace('⭐', '').replace('👑', '').strip()
            
            altitude = None
            if is_mountain:
                # Extract altitude from name (e.g. "Toubkal - 4167m" or "Toubkal (4167m)")
                # Try multiple patterns
                patterns = [
                    r'\(\s*(\d+)\s*m\s*\)', # (4167m)
                    r'[-–]\s*(\d+)\s*m'     # - 4167m
                ]
                
                for pattern in patterns:
                    alt_match = re.search(pattern, clean_name, re.IGNORECASE)
                    if alt_match:
                        altitude = int(alt_match.group(1))
                        # Remove altitude from name
                        clean_name = re.sub(pattern, '', clean_name).strip()
                        break
                
                # Clean up any trailing dashes or parens left
                clean_name = clean_name.strip(' -–()')
                
                # Prefix "Mount " if not present (though usually it's just the name in KML)
                if not clean_name.lower().startswith('mount '):
                    clean_name = f"Mount {clean_name}"
                
                kind = 'nature/mountain'
                # ID should start with "mount-"
                place_id = sanitize_id(clean_name) 
                if not place_id.startswith('mount-'):
                     place_id = f"mount-{place_id}"
            else:
                kind = get_kind(folder_name, name)
                place_id = sanitize_id(name)
            
            description = placemark.find('kml:description', NS)
            description_text = description.text.strip() if description is not None and description.text else ""
            
            point = placemark.find('kml:Point', NS)
            if point is not None:
                coords_text = point.find('kml:coordinates', NS).text.strip()
                lon, lat, _ = map(float, coords_text.split(','))
                
                # Parse specific fields from description (Era, Status, Description)
                era = []
                status = "open" # Default
                
                # Check for structured description
                if "🔻" in description_text:
                    parts = re.split(r'<br>|\n', description_text)
                    new_description = ""
                    
                    for part in parts:
                        part = part.strip()
                        if "Era:" in part:
                            era_text = part.split("Era:")[1].strip()
                            if era_text:
                                era = [era_text]
                        elif "Status:" in part:
                            status_text = part.split("Status:")[1].strip().lower()
                            if status_text in ["open", "closed", "temporarily_closed", "under_construction", "under_renovation", "restricted"]:
                                status = status_text
                            elif status_text == "closed": # Handle simple mapping if needed
                                status = "closed"
                        elif "Description:" in part:
                            new_description = part.split("Description:")[1].strip()
                        elif not part.startswith("🔻"): # Append other lines if they don't start with the marker
                             if new_description:
                                 new_description += " " + part
                             else:
                                 new_description = part
                    
                    if new_description:
                        description_text = new_description

                # Extract links from description (run this after parsing specific fields to keep description clean)
                links = []
                # Regex to find URLs
                url_pattern = r'(https?://[^\s<>"]+|www\.[^\s<>"]+)'
                found_urls = re.findall(url_pattern, description_text)
                
                for url in found_urls:
                    link_type = "website"
                    if "youtube.com" in url or "youtu.be" in url:
                        link_type = "video"
                    elif "instagram.com" in url or "facebook.com" in url or "twitter.com" in url:
                        link_type = "social"
                    elif "maps.google" in url or "goo.gl/maps" in url:
                        link_type = "map"
                        
                    links.append({
                        "url": url,
                        "type": link_type,
                        "title": "Link" # Default title
                    })
                    
                    # Remove URL from description
                    description_text = description_text.replace(url, "")
                
                # Clean up description
                description_text = re.sub(r'\s+', ' ', description_text).strip()
                description_text = re.sub(r'^-\s*<br>\s*', '', description_text) # Remove leading dash/br if any
                description_text = re.sub(r'<br>\s*-\s*', '', description_text) # Remove trailing dash/br if any
                description_text = description_text.strip('- ')
                description_text = description_text.replace('🔻', '').strip() # Clean up any remaining markers
                
                # Remove "province: *" from description
                description_text = re.sub(r'province:\s*[^.]+(\.|$)', '', description_text, flags=re.IGNORECASE).strip()
                
                if is_mountain:
                    chain_info = f"Mountain Chain: {folder_name}"
                    if description_text:
                        description_text += f" <br>{chain_info}"
                    else:
                        description_text = chain_info
                
                if not description_text:
                    description_text = "No description available."

                # User Preference Enforcement: Lat < 0, Lon > 0
                # KML is [Lon, Lat]. So `lon` is approx -7, `lat` is approx 30.
                # User wants: "location": { "latitude": -7, "longitude": 30 }
                # So we assign: latitude = lon, longitude = lat
                final_lat = lon
                final_lon = lat
                
                # Find province
                province_id = find_province(lat, lon, provinces)
                if not province_id:
                    province_id = "province/unknown"
                    print(f"Warning: Province not found for {clean_name} ({lat}, {lon})")

                # Construct location dict in specific order: lon, lat, alt, prov
                location_data = {
                    "longitude": final_lon,
                    "latitude": final_lat
                }
                if altitude is not None:
                    location_data['altitude'] = altitude
                
                location_data['province'] = f"province/{province_id}" if not province_id.startswith('province/') else province_id

                place_data = {
                    "name": clean_name,
                    "id": place_id,
                    "description": description_text,
                    "kind": kind,
                    "location": location_data,
                    "links": links,
                    "access": {
                        "type": "public",
                        "status": status,
                        "options": []
                    },
                    "timePeriods": era,
                    "activities": [],
                    "items": [],
                    "people": [],
                    "comments": [],
                    "metadata": {
                        "tags": []
                    },
                    "spec": {} # Wrapper? No, the structure in save_place handles the wrapper.
                }
                

                
                places.append(place_data)

                
                
    return places

def save_place(place):
    # Determine output directory based on province
    province_id = place['location']['province']
    # province_id is like "province/beni-mellal", we want "beni-mellal"
    province_slug = province_id.split('/')[-1] if '/' in province_id else "unknown"
    
    target_dir = os.path.join(OUTPUT_DIR, province_slug)
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
        
    file_path = os.path.join(target_dir, f"{place['id']}.json")
    
    # Construct the JSON object according to schema
    # Construct the JSON object according to schema
    data = {
        "version": "mrrakc/v0",
        "kind": place['kind'],
        "metadata": {
            "tags": []
        },
        "spec": {
            "name": place['name'],
            "id": place['id'],
            "description": place['description'] if place['description'] else "No description available.",
            "location": place['location'],
            "people": [],
            "timeline": [],
            "links": place.get('links', []),
            "activities": [],
            "items": [],
            # Default values for required fields
            "access": {
                "type": "public", 
                "status": place.get('status', 'open'),
                "options": []
            },
            "timePeriods": place.get('timePeriods', []),
            "comments": []
        }
    }
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Created {file_path}")

def main():
    provinces = load_provinces('.tmp/provinces.geojson')

    for kml_file in KML_FILES:
        print(f"Processing {kml_file}...")
        places = parse_kml(kml_file, provinces)
        print(f"Found {len(places)} places in {kml_file}.")
        
        for place in places:
            save_place(place)

if __name__ == "__main__":
    main()
