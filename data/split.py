#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path


def update_places_from_json(input_file, places_folder='./places'):
    """
    Process JSON array and update corresponding files in places folder.
    
    Args:
        input_file: Path to input JSON file containing array of objects
        places_folder: Path to folder containing place JSON files
    """
    try:
        # Read the input JSON file
        with open(input_file, 'r', encoding='utf-8') as f:
            items = json.load(f)
        
        # Verify it's a list
        if not isinstance(items, list):
            print('Error: Input JSON must be an array')
            return
        
        # Ensure places folder exists
        places_path = Path(places_folder)
        if not places_path.exists():
            print(f'Error: Places folder "{places_folder}" does not exist')
            return
        
        # Process each item
        for item in items:
            # Extract ID from spec.id
            spec = item.get('spec', {})
            item_id = spec.get('id')
            
            if not item_id:
                print('Warning: Item without spec.id found, skipping')
                continue
            
            file_path = places_path / f'{item_id}.json'
            
            # Check if file exists
            if file_path.exists():
                # File exists, overwrite it with pretty-printed JSON
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(item, f, indent=2, ensure_ascii=False)
                print(f'✓ Updated: {item_id}.json')
            else:
                # File doesn't exist
                print(f'✗ Not found: {item_id}.json')
        
        print('\nProcessing complete!')
        
    except FileNotFoundError:
        print(f'Error: Input file "{input_file}" not found')
    except json.JSONDecodeError as e:
        print(f'Error: Invalid JSON in input file - {e}')
    except Exception as e:
        print(f'Error: {e}')


if __name__ == '__main__':
    # Parse command line arguments
    input_file = sys.argv[1] if len(sys.argv) > 1 else './input.json'
    places_folder = sys.argv[2] if len(sys.argv) > 2 else './places'
    
    print(f'Reading from: {input_file}')
    print(f'Places folder: {places_folder}\n')
    
    update_places_from_json(input_file, places_folder)
