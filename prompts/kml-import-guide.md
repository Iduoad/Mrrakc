# KML Import Guide

This guide describes how to import a Google My Maps KML export into the Mrrakc project's places data.

## Prerequisites
- A KML file exported from Google My Maps (e.g., `CityName.kml`).
- The `scripts/import_kml.py` script.

## Steps

### 1. Prepare the Data
1.  Place the KML file in the `core/` directory (or update the script path).
2.  Ensure the target directory exists in `core/data/places/<city-name>/`.

### 2. Configure the Script
Open `core/scripts/import_kml.py` and update the following configurations:

```python
# Configuration
KML_FILE = 'CityName.kml'  # Path to your KML file
OUTPUT_DIR = 'data/places/city-name' # Target directory
SCHEMA_FILE = '../schema/places.json'
```

### 3. Update Mappings
The script uses `KIND_MAPPING` to map KML folders to the project's `kind` enum. You likely need to update this based on the folders in your specific KML file.

1.  **Extract Folder Names**: Run the following command to see the folders in your KML:
    ```bash
    grep "<name>" CityName.kml | grep -v "CityName" | sort | uniq
    ```
2.  **Update `KIND_MAPPING`**: Edit the `KIND_MAPPING` dictionary in `import_kml.py` to map these folder names to valid kinds from `schema/enums/kinds.json`.
3.  **Update `NAME_TO_KIND_OVERRIDE`**: If specific places need different kinds than their folder implies, add them to this dictionary.

### 4. Run the Script
Run the script from the `core/` directory:

```bash
python3 scripts/import_kml.py
```

### 5. Verify Output
1.  Check the generated JSON files in `data/places/<city-name>/`.
2.  Verify that:
    - `version` is "mrrakc/v0".
    - `kind` is correct.
    - `description` is not empty.
    - `$schema` field is NOT present.
    - Fields are ordered correctly (name, id, description, location, people, timeline, links, activities, items, access, timePeriods, comments).

## Example Prompt for AI Assistant
If you want an AI to do this for you, use the following prompt:

> I have a KML file `[Filename.kml]` for `[City Name]`. I want to import it into `data/places/[city-name]`.
> Please use the existing script `scripts/import_kml.py`.
> 1. Analyze the KML file to find the folder names.
> 2. Propose a mapping from KML folders to the kinds in `schema/enums/kinds.json`.
> 3. Update `scripts/import_kml.py` with the new file paths and mapping.
> 4. Ensure the script extracts links from the description into the `links` array (detecting video, social, map types) and **removes them from the description text**.
> 5. Run the script and verify the generated JSON files match the project structure (no $schema, correct field order, version present).
