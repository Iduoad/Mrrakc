#!/usr/bin/env python3
"""
KML to Mrrakc Places JSON Converter
A modular pipeline script for converting KML files to Mrrakc Places schema
"""

import json
import argparse
import sys
from pathlib import Path
from typing import Dict, Any, List
from abc import ABC, abstractmethod


# ============================================================================
# CONFIGURATION
# ============================================================================

DEFAULTS = {
    'access': {'type': 'public', 'status': 'open'},
    'timePeriods': [],  # Empty by default
}


# ============================================================================
# BASE STAGE CLASS
# ============================================================================

class Stage(ABC):
    """Base class for pipeline stages"""
    
    def __init__(self, name: str):
        self.name = name
    
    @abstractmethod
    def run(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process data and return result"""
        pass
    
    def log(self, message: str):
        print(f"[{self.name}] {message}")


# ============================================================================
# STAGE 1: PARSE KML
# ============================================================================

class ParseKMLStage(Stage):
    """Parse KML file and extract placemarks"""
    
    def __init__(self):
        super().__init__("PARSE")
    
    def run(self, data: Dict[str, Any]) -> Dict[str, Any]:
        self.log("Parsing KML file...")
        
        input_file = data.get('input_file')
        if not input_file:
            raise ValueError("No input file specified")
        
        try:
            from xml.etree import ElementTree as ET
        except ImportError:
            raise ImportError("xml.etree.ElementTree is required")
        
        # Parse KML file
        tree = ET.parse(input_file)
        root = tree.getroot()
        
        # Debug: Print root tag and namespace
        self.log(f"Root tag: {root.tag}")
        self.log(f"Root attribs: {root.attrib}")
        
        # Try to detect namespace from root tag
        ns = {}
        if '}' in root.tag:
            namespace = root.tag.split('}')[0].strip('{')
            ns = {'kml': namespace}
            self.log(f"Detected namespace: {namespace}")
        else:
            # Try common KML namespace
            ns = {'kml': 'http://www.opengis.net/kml/2.2'}
            self.log("Using default KML namespace")
        
        placemarks = []
        
        # Try finding placemarks with namespace
        placemark_elements = root.findall('.//kml:Placemark', ns)
        self.log(f"Found {len(placemark_elements)} placemarks with namespace")
        
        # If no placemarks found, try without namespace
        if not placemark_elements:
            self.log("Trying without namespace...")
            placemark_elements = root.findall('.//Placemark')
            self.log(f"Found {len(placemark_elements)} placemarks without namespace")
        
        # Find all Placemark elements
        for placemark in placemark_elements:
            place_data = {}
            
            # Helper function to find elements with or without namespace
            def find_elem(parent, tag):
                # Try with namespace first
                elem = parent.find(f'kml:{tag}', ns) if ns else None
                # Try without namespace
                if elem is None:
                    elem = parent.find(tag)
                return elem
            
            # Extract name
            name_elem = find_elem(placemark, 'name')
            if name_elem is not None and name_elem.text:
                place_data['name'] = name_elem.text.strip()
            
            # Extract description
            desc_elem = find_elem(placemark, 'description')
            if desc_elem is not None and desc_elem.text:
                place_data['description'] = desc_elem.text.strip()
            
            # Extract coordinates from Point
            point = placemark.find('.//kml:Point/kml:coordinates', ns) if ns else None
            if point is None:
                point = placemark.find('.//Point/coordinates')
            
            if point is not None and point.text:
                coords = point.text.strip().split(',')
                if len(coords) >= 2:
                    place_data['longitude'] = float(coords[0])
                    place_data['latitude'] = float(coords[1])
                    if len(coords) >= 3:
                        place_data['altitude'] = float(coords[2])
            
            # Extract extended data if present
            extended_data = {}
            for data_elem in placemark.findall('.//kml:ExtendedData/kml:Data', ns) if ns else placemark.findall('.//ExtendedData/Data'):
                name = data_elem.get('name')
                value_elem = find_elem(data_elem, 'value')
                if name and value_elem is not None and value_elem.text:
                    extended_data[name] = value_elem.text.strip()
            
            if extended_data:
                place_data['extended_data'] = extended_data
            
            self.log(f"Parsed placemark: {place_data.get('name', 'unnamed')}")
            
            # Only add if we have at least a name or coordinates
            if 'name' in place_data or ('longitude' in place_data and 'latitude' in place_data):
                placemarks.append(place_data)
        
        self.log(f"Found {len(placemarks)} placemarks")
        
        return {
            'placemarks': placemarks,
            'source_file': data.get('input_file')
        }


# ============================================================================
# STAGE 2: NORMALIZE
# ============================================================================

class NormalizeStage(Stage):
    """Normalize and clean data"""
    
    def __init__(self):
        super().__init__("NORMALIZE")
        
        # URL patterns for link type detection
        self.url_patterns = {
            'video': [
                'youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com',
                'twitch.tv', 'tiktok.com'
            ],
            'social': [
                'facebook.com', 'fb.com', 'twitter.com', 'x.com',
                'instagram.com', 'linkedin.com', 'pinterest.com'
            ],
            'image': [
                'flickr.com', 'imgur.com', 'unsplash.com', 'pexels.com'
            ],
            'map': [
                'maps.google.com', 'google.com/maps', 'openstreetmap.org',
                'maps.apple.com', 'waze.com'
            ],
            'article': [
                'wikipedia.org', 'wikivoyage.org', 'medium.com',
                'blog', 'article', 'news'
            ],
            'book': [
                'goodreads.com', 'amazon.com/dp', 'books.google.com'
            ],
            'movie': [
                'imdb.com', 'rottentomatoes.com', 'themoviedb.org'
            ]
        }
    
    def detect_link_type(self, url: str) -> str:
        """Detect link type from URL"""
        url_lower = url.lower()
        
        # Check common image extensions
        if any(url_lower.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']):
            return 'image'
        
        # Check video extensions
        if any(url_lower.endswith(ext) for ext in ['.mp4', '.mov', '.avi', '.webm']):
            return 'video'
        
        # Check against URL patterns
        for link_type, patterns in self.url_patterns.items():
            if any(pattern in url_lower for pattern in patterns):
                return link_type
        
        # Default to website
        return 'website'
    
    def parse_description(self, description: str) -> Dict[str, Any]:
        """
        Parse description to extract structured data and links
        
        Expected format:
        - Key-value pairs: "key: value"
        - Links: Any URL (http:// or https://)
        - Remaining text becomes the description
        """
        import re
        
        result = {
            'description': '',
            'links': [],
            'extracted_fields': {}
        }
        
        if not description:
            result['description'] = 'No description available'
            return result
        
        # Replace <br> tags with newlines
        description = re.sub(r'<br\s*/?>', '\n', description, flags=re.IGNORECASE)
        
        lines = description.split('\n')
        description_parts = []
        
        # URL regex pattern
        url_pattern = re.compile(r'https?://[^\s]+')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # First, extract all URLs from the line
            url_matches = url_pattern.findall(line)
            
            # Check if line contains a key-value pair (key: value)
            if ':' in line and not line.startswith('http'):
                parts = line.split(':', 1)
                if len(parts) == 2:
                    key = parts[0].strip().lower().replace(' ', '_')
                    value = parts[1].strip()
                    
                    # Check if this is a schema field (not just any key-value)
                    # Common schema fields to extract
                    schema_fields = ['built', 'height', 'width', 'area', 'capacity', 
                                   'founded', 'architect', 'style', 'period']
                    
                    # If the key is a known schema field and value doesn't contain URL
                    if key in schema_fields and not url_matches:
                        result['extracted_fields'][key] = value
                        continue
                    
                    # If key is "description" or similar, extract the value text
                    if key in ['description', 'desc', 'about']:
                        # Remove the "Description:" prefix and process the value
                        line = value
            
            # Check for URLs in the line
            if url_matches:
                for url in url_matches:
                    # Get text before URL as title (or use URL as title)
                    text_before = url_pattern.sub('', line).strip()
                    # Remove common separators
                    text_before = text_before.rstrip(':-').strip()
                    link_title = text_before if text_before else url
                    
                    result['links'].append({
                        'url': url,
                        'title': link_title,
                        'type': self.detect_link_type(url)
                    })
                
                # Remove URLs from line and add remaining text to description
                remaining_text = url_pattern.sub('', line).strip()
                # Remove common separators at the end
                remaining_text = remaining_text.rstrip(':-').strip()
                if remaining_text:
                    description_parts.append(remaining_text)
            else:
                # Regular description text
                description_parts.append(line)
        
        # Join description parts
        final_description = ' '.join(description_parts).strip()
        result['description'] = final_description if final_description else 'No description available'
        
        return result
    
    def normalize_coordinates(self, place: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize and validate coordinates"""
        coords = {}
        
        if 'longitude' in place:
            coords['longitude'] = round(float(place['longitude']), 6)
        
        if 'latitude' in place:
            coords['latitude'] = round(float(place['latitude']), 6)
        
        if 'altitude' in place:
            coords['altitude'] = round(float(place['altitude']), 2)
        
        return coords
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text fields"""
        if not text:
            return ''
        
        import html
        
        # Decode HTML entities
        text = html.unescape(text)
        
        # Remove HTML tags (basic cleanup)
        import re
        text = re.sub(r'<[^>]+>', '', text)
        
        # Normalize whitespace
        text = ' '.join(text.split())
        
        return text.strip()
    
    def run(self, data: Dict[str, Any]) -> Dict[str, Any]:
        self.log("Normalizing data...")
        
        placemarks = data.get('placemarks', [])
        normalized_places = []
        
        for place in placemarks:
            normalized = {}
            
            # Clean and normalize name
            if 'name' in place:
                normalized['name'] = self.clean_text(place['name'])
            
            # Parse and extract from description
            raw_description = place.get('description', '')
            parsed = self.parse_description(raw_description)
            
            normalized['description'] = parsed['description']
            
            if parsed['links']:
                normalized['links'] = parsed['links']
            
            if parsed['extracted_fields']:
                normalized['extracted_fields'] = parsed['extracted_fields']
            
            # Normalize coordinates
            coords = self.normalize_coordinates(place)
            if coords:
                normalized['coordinates'] = coords
            
            # Preserve extended data
            if 'extended_data' in place:
                normalized['extended_data'] = place['extended_data']
            
            normalized_places.append(normalized)
            
            self.log(f"Normalized: {normalized.get('name', 'unnamed')} "
                    f"({len(parsed['links'])} links, "
                    f"{len(parsed['extracted_fields'])} fields)")
        
        self.log(f"Normalized {len(normalized_places)} places")
        
        return {
            'normalized_places': normalized_places,
            'source_file': data.get('source_file')
        }


# ============================================================================
# STAGE 3: ENRICH
# ============================================================================

class EnrichStage(Stage):
    """Enrich data with classifications and metadata"""
    
    def __init__(self, kind_mappings_file=None, province_geojson_file=None, default_province=None):
        super().__init__("ENRICH")
        
        self.default_province = default_province or 'province/marrakech'
        
        # Load kind mappings from file if provided
        self.kind_mappings = {}
        if kind_mappings_file and Path(kind_mappings_file).exists():
            self.log(f"Loading kind mappings from {kind_mappings_file}")
            with open(kind_mappings_file, 'r', encoding='utf-8') as f:
                self.kind_mappings = json.load(f)
            self.log(f"Loaded {len(self.kind_mappings)} kind mappings")
        else:
            self.log("No kind mappings file provided, using default kind")
        
        # Load province boundaries from GeoJSON if provided
        self.province_boundaries = None
        if province_geojson_file and Path(province_geojson_file).exists():
            self.log(f"Loading province boundaries from {province_geojson_file}")
            with open(province_geojson_file, 'r', encoding='utf-8') as f:
                self.province_boundaries = json.load(f)
            self.log(f"Loaded province boundaries")
        else:
            self.log("No province GeoJSON file provided, using default province")
    
    def classify_kind(self, place: Dict[str, Any]) -> str:
        """Get place kind from mappings file or use default"""
        place_id = place.get('id', '')
        place_name = place.get('name', '')
        
        # Try to find in mappings by ID
        if place_id in self.kind_mappings:
            return self.kind_mappings[place_id]
        
        # Try to find in mappings by name
        if place_name in self.kind_mappings:
            return self.kind_mappings[place_name]
        
        # Default
        return 'urban/landmark'
    
    def infer_time_periods(self, place: Dict[str, Any]) -> List[str]:
        """Infer time periods - returns empty list by default"""
        # You can add logic here if needed, or leave empty
        return []
    
    def point_in_polygon(self, point: tuple, polygon: list) -> bool:
        """Check if point is inside polygon using ray casting algorithm"""
        x, y = point
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
    
    def determine_province(self, coords: Dict[str, float]) -> str:
        """Determine province from coordinates using GeoJSON boundaries"""
        lat = coords.get('latitude')
        lon = coords.get('longitude')
        
        if not lat or not lon:
            return self.default_province
        
        # If no GeoJSON provided, use default
        if not self.province_boundaries:
            return self.default_province
        
        # Check each province in GeoJSON
        point = (lon, lat)  # GeoJSON uses [lon, lat] order
        
        for feature in self.province_boundaries.get('features', []):
            properties = feature.get('properties', {})
            geometry = feature.get('geometry', {})
            
            # Get province ID from properties
            province_id = properties.get('id') or properties.get('province_id')
            
            if not province_id:
                continue
            
            # Handle different geometry types
            geom_type = geometry.get('type')
            coordinates = geometry.get('coordinates', [])
            
            if geom_type == 'Polygon':
                # Polygon coordinates are [exterior_ring, hole1, hole2, ...]
                exterior_ring = coordinates[0] if coordinates else []
                if self.point_in_polygon(point, exterior_ring):
                    return province_id
            
            elif geom_type == 'MultiPolygon':
                # MultiPolygon coordinates are [[polygon1], [polygon2], ...]
                for polygon in coordinates:
                    exterior_ring = polygon[0] if polygon else []
                    if self.point_in_polygon(point, exterior_ring):
                        return province_id
        
        # If no province found, use default
        return self.default_province
    
    def generate_id(self, name: str) -> str:
        """Generate kebab-case ID from name"""
        import re
        
        # Convert to lowercase
        id_str = name.lower()
        
        # Remove special characters except spaces and hyphens
        id_str = re.sub(r'[^a-z0-9\s-]', '', id_str)
        
        # Replace spaces with hyphens
        id_str = re.sub(r'\s+', '-', id_str)
        
        # Remove multiple consecutive hyphens
        id_str = re.sub(r'-+', '-', id_str)
        
        # Remove leading/trailing hyphens
        id_str = id_str.strip('-')
        
        return id_str
    
    def run(self, data: Dict[str, Any]) -> Dict[str, Any]:
        self.log("Enriching data...")
        
        normalized_places = data.get('normalized_places', [])
        enriched_places = []
        
        for place in normalized_places:
            enriched = place.copy()
            
            # Generate ID from name
            if 'name' in place:
                enriched['id'] = self.generate_id(place['name'])
            
            # Classify kind from mappings file
            enriched['kind'] = self.classify_kind(enriched)
            
            # Infer time periods (empty by default)
            enriched['timePeriods'] = self.infer_time_periods(place)
            
            # Determine province from GeoJSON or use default
            if 'coordinates' in place:
                enriched['province'] = self.determine_province(place['coordinates'])
            else:
                enriched['province'] = self.default_province
            
            enriched_places.append(enriched)
            
            self.log(f"Enriched: {enriched.get('name', 'unnamed')} -> "
                    f"{enriched['kind']} in {enriched['province']}")
        
        self.log(f"Enriched {len(enriched_places)} places")
        
        return {
            'enriched_places': enriched_places,
            'source_file': data.get('source_file')
        }


# ============================================================================
# STAGE 4: VALIDATE
# ============================================================================

class ValidateStage(Stage):
    """Validate against JSON schema"""
    
    def __init__(self):
        super().__init__("VALIDATE")
    
    def validate_coordinates(self, coords: Dict[str, float]) -> List[str]:
        """Validate coordinate values"""
        errors = []
        
        lat = coords.get('latitude')
        lon = coords.get('longitude')
        
        if lat is None or lon is None:
            errors.append("Missing latitude or longitude")
        else:
            # Morocco bounds check
            if not (21.0 <= lat <= 36.0):
                errors.append(f"Latitude {lat} outside Morocco bounds (21-36)")
            if not (-17.0 <= lon <= -1.0):
                errors.append(f"Longitude {lon} outside Morocco bounds (-17 to -1)")
        
        return errors
    
    def validate_required_fields(self, place: Dict[str, Any]) -> List[str]:
        """Validate required fields are present"""
        errors = []
        
        required = ['name', 'id', 'description', 'kind', 'timePeriods', 'province']
        
        for field in required:
            if field not in place:
                errors.append(f"Missing required field: {field}")
                continue
            
            # Check content for specific types
            value = place[field]
            
            # Strings should not be empty
            if isinstance(value, str) and not value.strip():
                errors.append(f"Field cannot be empty: {field}")
        
        return errors
    
    def validate_enums(self, place: Dict[str, Any]) -> List[str]:
        """Validate enum values"""
        errors = []
        
        # Validate kind format
        if 'kind' in place:
            if '/' not in place['kind']:
                errors.append(f"Invalid kind format: {place['kind']} (should be category/kind)")
        
        return errors
    
    def run(self, data: Dict[str, Any]) -> Dict[str, Any]:
        self.log("Validating against schema...")
        
        enriched_places = data.get('enriched_places', [])
        validated_places = []
        all_errors = []
        
        for i, place in enumerate(enriched_places):
            errors = []
            
            # Validate required fields
            errors.extend(self.validate_required_fields(place))
            
            # Validate coordinates if present
            if 'coordinates' in place:
                errors.extend(self.validate_coordinates(place['coordinates']))
            
            # Validate enums
            errors.extend(self.validate_enums(place))
            
            if errors:
                self.log(f"Validation errors for '{place.get('name', 'unnamed')}': {', '.join(errors)}")
                all_errors.append({
                    'place': place.get('name', f'index_{i}'),
                    'errors': errors
                })
            
            validated_places.append(place)
        
        if all_errors:
            self.log(f"Found {len(all_errors)} places with validation errors")
        else:
            self.log("All places validated successfully")
        
        return {
            'validated_places': validated_places,
            'validation_errors': all_errors,
            'source_file': data.get('source_file')
        }


# ============================================================================
# STAGE 5: TRANSFORM
# ============================================================================

class TransformStage(Stage):
    """Transform to final Mrrakc Places format"""
    
    def __init__(self):
        super().__init__("TRANSFORM")
    
    def transform_place(self, place: Dict[str, Any]) -> Dict[str, Any]:
        """Transform a single place to final schema format"""
        
        # Build location object with all fields (empty if needed)
        location = {
            'province': place.get('province', 'province/marrakech'),
            'longitude': None,
            'latitude': None
        }
        
        if 'coordinates' in place:
            coords = place['coordinates']
            location['longitude'] = coords.get('longitude')
            location['latitude'] = coords.get('latitude')
            if 'altitude' in coords:
                location['altitude'] = coords.get('altitude')
        
        # Build access object with all fields
        access = {
            'type': DEFAULTS['access']['type'],
            'status': DEFAULTS['access']['status'],
            'options': []  # Empty array
        }
        
        # Build spec object with all required and optional fields
        spec = {
            'name': place.get('name', 'Unnamed Place'),
            'id': place.get('id', 'unnamed-place'),
            'description': place.get('description', 'No description available'),
            'location': location,
            'access': access,
            'timePeriods': place.get('timePeriods', DEFAULTS['timePeriods']),
            'people': [],  # Empty array
            'timeline': [],  # Empty array
            'links': [],  # Empty array by default
            'activities': [],  # Empty array
            'items': [],  # Empty array
            'comments': []  # Empty array
        }
        
        # Add links if present
        if 'links' in place and place['links']:
            spec['links'] = place['links']
        
        # Add extracted fields as comments if present
        if 'extracted_fields' in place and place['extracted_fields']:
            spec['comments'] = [
                f"{key}: {value}" for key, value in place['extracted_fields'].items()
            ]
        
        # Build final place object
        final_place = {
            'kind': place.get('kind', 'places/landmark'),
            'spec': spec
        }
        
        return final_place
    
    def run(self, data: Dict[str, Any]) -> Dict[str, Any]:
        self.log("Transforming to final format...")
        
        validated_places = data.get('validated_places', [])
        final_places = []
        
        for place in validated_places:
            transformed = self.transform_place(place)
            final_places.append(transformed)
        
        self.log(f"Transformed {len(final_places)} places to final format")
        
        return {
            'places': final_places,
            'source_file': data.get('source_file')
        }


# ============================================================================
# STAGE 6: SAVE
# ============================================================================

class SavePlacesStage(Stage):
    """Save places to individual JSON files"""
    
    def __init__(self):
        super().__init__("SAVE")
    
    def run(self, data: Dict[str, Any]) -> Dict[str, Any]:
        self.log("Saving places to individual files...")
        
        places = data.get('places', [])
        
        # Determine data directory relative to this script
        # Assumes script is in core/scripts/ and data in core/data/
        script_dir = Path(__file__).resolve().parent
        base_dir = script_dir.parent / 'data' / 'places'
        
        # Pre-scan for existing files
        existing_files = []
        for place in places:
            spec = place.get('spec', {})
            place_id = spec.get('id')
            location = spec.get('location', {})
            province_id = location.get('province', 'province/unknown')
            
            if not place_id:
                continue
                
            province_slug = province_id.split('/')[-1]
            file_path = base_dir / province_slug / f"{place_id}.json"
            
            if file_path.exists():
                existing_files.append(file_path)

        # Warnings and Prompting
        if existing_files:
            print(f"\nWARNING: Found {len(existing_files)} existing files that will be overwritten:")
            for f in existing_files[:10]: # Validated list length limit for display
                print(f"  - {f}")
            if len(existing_files) > 10:
                print(f"  ... and {len(existing_files) - 10} more.")
            print("")
        
        overwrite_all = False
        saved_count = 0
        skipped_count = 0
        
        for place in places:
            spec = place.get('spec', {})
            place_id = spec.get('id')
            location = spec.get('location', {})
            province_id = location.get('province', 'province/unknown')
            
            if not place_id:
                self.log(f"Skipping place without ID: {spec.get('name')}")
                continue
                
            # Extract province slug (e.g. "province/marrakesh" -> "marrakesh")
            province_slug = province_id.split('/')[-1]
            
            # Create province directory if needed
            province_dir = base_dir / province_slug
            province_dir.mkdir(parents=True, exist_ok=True)
            
            # Save file
            file_path = province_dir / f"{place_id}.json"
            
            if file_path.exists() and not overwrite_all:
                while True:
                    response = input(f"Overwrite {file_path}? [y]es, [n]o, [a]ll, [q]uit: ").lower()
                    if response in ['y', 'yes']:
                        break
                    elif response in ['n', 'no']:
                        skipped_count += 1
                        continue # continue outer loop checks next place
                    elif response in ['a', 'all']:
                        overwrite_all = True
                        break
                    elif response in ['q', 'quit']:
                        print("Operation aborted by user.")
                        return data
                    
                # If user chose 'n', the loop continues to next place
                if response in ['n', 'no']:
                   continue

            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(place, f, indent=2, ensure_ascii=False)
            
            saved_count += 1
        
        self.log(f"Saved {saved_count} places to {base_dir}")
        if skipped_count > 0:
            self.log(f"Skipped {skipped_count} existing files")
        
        return data


# ============================================================================
# PIPELINE
# ============================================================================

class Pipeline:
    """Main pipeline orchestrator"""
    
    def __init__(self, kind_mappings=None, province_geojson=None, default_province=None):
        self.stages = {
            'parse': ParseKMLStage(),
            'normalize': NormalizeStage(),
            'enrich': EnrichStage(kind_mappings, province_geojson, default_province),
            'validate': ValidateStage(),
            'transform': TransformStage(),
            'save': SavePlacesStage()
        }
    
    def run(self, input_file: Path, stages_to_run: List[str]) -> Dict[str, Any]:
        """Run specified stages in sequence"""
        
        print(f"\n{'='*60}")
        print(f"KML to JSON Pipeline")
        print(f"Input: {input_file}")
        print(f"Stages: {' → '.join(stages_to_run)}")
        print(f"{'='*60}\n")
        
        # Initialize with input file
        data = {'input_file': str(input_file)}
        
        # Run each stage
        for stage_name in stages_to_run:
            if stage_name not in self.stages:
                raise ValueError(f"Unknown stage: {stage_name}")
            
            stage = self.stages[stage_name]
            data = stage.run(data)
        
        return data


# ============================================================================
# CLI
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='Convert KML files to Mrrakc Places JSON format'
    )
    
    parser.add_argument(
        'input',
        type=Path,
        help='Input KML file'
    )
    
    parser.add_argument(
        '-o', '--output',
        type=Path,
        default=None,
        help='Output JSON file (default: input_name.json)'
    )
    
    parser.add_argument(
        '-s', '--stages',
        type=str,
        default='parse,normalize,enrich,validate,transform,save',
        help='Comma-separated list of stages (default: all)'
    )
    
    parser.add_argument(
        '-k', '--kind-mappings',
        type=Path,
        default=None,
        help='JSON file with place -> kind mappings'
    )
    
    parser.add_argument(
        '-p', '--province-geojson',
        type=Path,
        default=None,
        help='GeoJSON file with province boundaries'
    )
    
    parser.add_argument(
        '-d', '--default-province',
        type=str,
        default='province/marrakech',
        help='Default province ID if coordinates not found (default: province/marrakech)'
    )
    
    args = parser.parse_args()
    
    # Validate input
    if not args.input.exists():
        print(f"Error: File not found: {args.input}")
        sys.exit(1)
    
    # Validate optional files if provided
    if args.kind_mappings and not args.kind_mappings.exists():
        print(f"Warning: Kind mappings file not found: {args.kind_mappings}")
    
    if args.province_geojson and not args.province_geojson.exists():
        print(f"Warning: Province GeoJSON file not found: {args.province_geojson}")
    
    # Set output file
    output = args.output or args.input.with_suffix('.json')
    
    # Parse stages
    stages = [s.strip() for s in args.stages.split(',')]
    
    try:
        # Run pipeline
        pipeline = Pipeline(
            kind_mappings=args.kind_mappings,
            province_geojson=args.province_geojson,
            default_province=args.default_province
        )
        result = pipeline.run(args.input, stages)
        
        # Determine what to save based on which stages were run
        output_data = result
        
        if 'places' in result:
            output_data = result['places']
        elif 'validated_places' in result:
            output_data = result['validated_places']
        elif 'enriched_places' in result:
            output_data = result['enriched_places']
        elif 'normalized_places' in result:
            output_data = result['normalized_places']
        elif 'placemarks' in result:
            # Raw parsed output
            output_data = result['placemarks']
        
        with open(output, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n✓ Success! Output saved to: {output}")
        print(f"  Total items: {len(output_data) if isinstance(output_data, list) else 1}\n")
        
    except Exception as e:
        print(f"\n✗ Error: {e}\n")
        sys.exit(1)


if __name__ == '__main__':
    main()
