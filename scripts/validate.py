#!/usr/bin/env python3
"""
Schema validation script for CI environments.
Validates JSON files against their schemas with support for references.
"""

import json
import os
import sys
import argparse
import concurrent.futures
from pathlib import Path
from datetime import datetime
from urllib.parse import urljoin
from referencing import Registry, Resource
from referencing.jsonschema import SchemaRegistry
from jsonschema import validate, ValidationError


def load_json_file(file_path):
    """Load and parse a JSON file."""
    try:
        with open(file_path, 'r') as f:
            content = f.read().strip()
            if not content:
                print(f"Warning: {file_path} is empty")
                return {"empty": True}
            return json.loads(content)
    except json.JSONDecodeError as e:
        print(f"Error parsing {file_path}: {e}")
        return None
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return None


def get_schema_for_data_folder(data_folder_name, schema_dir):
    """Get the corresponding schema file path for a data folder."""
    schema_file = schema_dir / f"{data_folder_name}.json"
    if schema_file.exists():
        return schema_file
    return None


def validate_file(data_file, schema_file, registry=None):
    """Validate a single JSON file against its schema."""
    data = load_json_file(data_file)
    if data is None:
        return False, f"Failed to load data file: {data_file}"
    
    # Special handling for empty files
    if isinstance(data, dict) and data.get("empty") is True:
        return False, f"File is empty: {data_file}"
    
    schema = load_json_file(schema_file)
    if schema is None:
        return False, f"Failed to load schema file: {schema_file}"
    
    # Generate URIs for validation scope
    schema_dir = os.path.dirname(os.path.abspath(schema_file))
    schema_uri = f"file://{os.path.abspath(schema_file)}"
    
    try:
        # Set up validation environment
        if registry:
            # Create a registry for this specific validation context with proper scoping
            # Add the schema with its URI to establish the validation scope
            current_schema_registry = registry.with_resource(schema_uri, Resource.from_contents(schema))
            
            # Use the located schema resource from the registry for validation
            validate(
                instance=data, 
                schema=schema, 
                registry=current_schema_registry
            )
        else:
            # Create a minimal registry for this schema if no global registry provided
            local_registry = SchemaRegistry().with_resource(schema_uri, Resource.from_contents(schema))
            validate(instance=data, schema=schema, registry=local_registry)
        return True, None
    except ValidationError as e:
        return False, str(e)


def build_schema_registry(schema_dir):
    """Build a schema registry with all available schemas for reference resolution."""
    registry = SchemaRegistry()
    base_dir = f"file://{os.path.abspath(schema_dir)}/"
    
    # Add base schema
    base_schema_path = schema_dir / "base.json"
    if base_schema_path.exists():
        base_schema = load_json_file(base_schema_path)
        if base_schema:
            # Add with multiple URI patterns to maximize compatibility
            
            # 1. Full URI with base_dir
            base_uri = f"{base_dir}base.json"
            registry = registry.with_resource(base_uri, Resource.from_contents(base_schema))
            
            # 2. Simple filename for relative references
            registry = registry.with_resource("base.json", Resource.from_contents(base_schema))
            
            # 3. Absolute file URI
            abs_uri = f"file://{os.path.abspath(base_schema_path)}"
            if abs_uri != base_uri:
                registry = registry.with_resource(abs_uri, Resource.from_contents(base_schema))
      # Add component schemas
    components_dir = schema_dir / "components"
    if components_dir.exists():
        for file_path in components_dir.glob("*.json"):
            schema = load_json_file(file_path)
            if schema:
                file_name = file_path.name
                relative_path = file_path.relative_to(schema_dir)
                relative_path_str = str(relative_path).replace(os.sep, '/')
                
                # 1. Register with full base directory URI
                rel_uri = f"{base_dir}{relative_path_str}"
                registry = registry.with_resource(rel_uri, Resource.from_contents(schema))
                
                # 2. Register with just the relative path (components/file.json)
                registry = registry.with_resource(relative_path_str, Resource.from_contents(schema))
                
                # 3. Register with absolute file URI for backwards compatibility
                abs_uri = f"file://{os.path.abspath(file_path)}"
                if abs_uri != rel_uri:
                    registry = registry.with_resource(abs_uri, Resource.from_contents(schema))
      # Add enum schemas
    enums_dir = schema_dir / "enums"
    if enums_dir.exists():
        for file_path in enums_dir.glob("*.json"):
            schema = load_json_file(file_path)
            if schema:
                file_name = file_path.name
                relative_path = file_path.relative_to(schema_dir)
                relative_path_str = str(relative_path).replace(os.sep, '/')
                
                # 1. Register with full base directory URI
                rel_uri = f"{base_dir}{relative_path_str}"
                registry = registry.with_resource(rel_uri, Resource.from_contents(schema))
                
                # 2. Register with just the relative path (enums/file.json)
                registry = registry.with_resource(relative_path_str, Resource.from_contents(schema))
                
                # 3. Register with absolute file URI for backwards compatibility
                abs_uri = f"file://{os.path.abspath(file_path)}"
                if abs_uri != rel_uri:
                    registry = registry.with_resource(abs_uri, Resource.from_contents(schema))
      # Add main schemas
    for file_path in schema_dir.glob("*.json"):
        if file_path.name != "base.json":  # base.json already added
            schema = load_json_file(file_path)
            if schema:
                file_name = file_path.name
                relative_path = file_path.relative_to(schema_dir)
                relative_path_str = str(relative_path).replace(os.sep, '/')
                
                # 1. Register with full base directory URI
                rel_uri = f"{base_dir}{relative_path_str}"
                registry = registry.with_resource(rel_uri, Resource.from_contents(schema))
                
                # 2. Register with just the filename (people.json, places.json)
                registry = registry.with_resource(file_name, Resource.from_contents(schema))
                
                # 3. Register with absolute file URI for backwards compatibility
                abs_uri = f"file://{os.path.abspath(file_path)}"
                if abs_uri != rel_uri:
                    registry = registry.with_resource(abs_uri, Resource.from_contents(schema))
    
    return registry


def process_data_folder(data_folder_path, schema_file, registry, parallel=False):
    """Process all JSON files in a data folder."""
    results = []
    json_files = [f for f in data_folder_path.glob("*.json")]
    
    # Use parallel processing if enabled and there are multiple files
    if parallel and len(json_files) > 1:
        with concurrent.futures.ProcessPoolExecutor() as executor:
            futures = {
                executor.submit(validate_file, data_file, schema_file, registry): data_file
                for data_file in json_files
            }
            
            for future in concurrent.futures.as_completed(futures):
                data_file = futures[future]
                is_valid, error_msg = future.result()
                results.append((data_file, is_valid, error_msg))
    else:
        # Sequential processing
        for data_file in json_files:
            is_valid, error_msg = validate_file(data_file, schema_file, registry)
            results.append((data_file, is_valid, error_msg))
    
    return results


def generate_report(results, output_file=None):
    """Generate a validation report."""
    valid_count = sum(1 for _, is_valid, _ in results if is_valid)
    total_count = len(results)
    
    report_lines = [
        f"Schema Validation Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"Results: {valid_count}/{total_count} files valid",
        "-" * 80
    ]
    
    # Group results by data folder for better readability
    folder_results = {}
    for data_file, is_valid, error_msg in results:
        folder = data_file.parent.name
        if folder not in folder_results:
            folder_results[folder] = []
        folder_results[folder].append((data_file, is_valid, error_msg))
    
    # Add detailed results
    for folder, folder_data in folder_results.items():
        report_lines.append(f"\nFolder: {folder}")
        for data_file, is_valid, error_msg in folder_data:
            status = "✅ VALID" if is_valid else "❌ INVALID"
            report_lines.append(f"{status}: {data_file.name}")
            if not is_valid:
                # Format error message for readability
                indented_error = "\n".join(f"       {line}" for line in error_msg.split("\n"))
                report_lines.append(indented_error)
    
    report = "\n".join(report_lines)
    
    # Print report to console
    print(report)
    
    # Save report to file if requested
    if output_file:
        with open(output_file, "w") as f:
            f.write(report)
    
    return valid_count == total_count


def main():
    """Main function to validate all JSON files in data directories."""
    parser = argparse.ArgumentParser(description="Validate JSON files against schemas")
    parser.add_argument("--parallel", action="store_true", help="Use parallel processing")
    parser.add_argument("--report", help="Generate a report file")
    parser.add_argument("--quiet", action="store_true", help="Minimal output")
    args = parser.parse_args()
    
    # Setup paths
    root_dir = Path(os.path.dirname(os.path.abspath(__file__))).parent
    data_dir = root_dir / "data"
    schema_dir = root_dir / "schema"
    
    # Check if data directory exists
    if not data_dir.exists():
        print(f"Error: Data directory not found at {data_dir}")
        return 1
      # Check if schema directory exists
    if not schema_dir.exists():
        print(f"Error: Schema directory not found at {schema_dir}")
        return 1
    
    # Build schema registry for reference resolution
    registry = build_schema_registry(schema_dir)
    
    # Collect all validation results
    all_results = []
      # Process each data folder
    for data_folder_path in data_dir.iterdir():
        if not data_folder_path.is_dir():
            continue
            
        schema_file = get_schema_for_data_folder(data_folder_path.name, schema_dir)
        if not schema_file:
            print(f"Error: No schema found for data folder '{data_folder_path.name}'")
            all_results.append((data_folder_path, False, "No schema file found"))
            continue
            
        if not args.quiet:
            print(f"\nValidating files in {data_folder_path.name}...")
        
        folder_results = process_data_folder(
            data_folder_path, 
            schema_file, 
            registry,
            parallel=args.parallel
        )
        
        if not args.quiet:
            for data_file, is_valid, error_msg in folder_results:
                if is_valid:
                    print(f"✅ {data_file} is valid")
                else:
                    print(f"❌ {data_file} is invalid:")
                    print(f"   {error_msg}")
        
        all_results.extend(folder_results)
    
    # Generate report if needed
    is_valid = generate_report(all_results, args.report)
    
    return 0 if is_valid else 1


if __name__ == "__main__":
    sys.exit(main())
