import fs from 'node:fs/promises';
import path from 'node:path';
import jmespath from 'jmespath';

const DATA_DIR = path.resolve(process.cwd(), '../data');
const MAPS_DIR = path.join(DATA_DIR, 'maps');
const PLACES_DIR = path.join(DATA_DIR, 'places');
const OUTPUT_FILE = path.resolve(process.cwd(), 'src/data/generated/maps.json');

interface Place {
    id: string;
    kind: string;
    spec: {
        name: string;
        description: string;
        location: {
            province: string;
            latitude: number;
            longitude: number;
        };
        [key: string]: any;
    };
    [key: string]: any;
}

interface MapData {
    version: string;
    metadata?: {
        tags?: string[];
    };
    spec: {
        id: string;
        title: string;
        description?: string;
        strategy: 'explicit' | 'query' | 'mixed';
        content: {
            ids?: string[];
            query?: string;
        };
    };
}

async function getFiles(dir: string): Promise<string[]> {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

async function loadPlaces(): Promise<Place[]> {
    const files = await getFiles(PLACES_DIR);
    const places: Place[] = [];
    for (const file of files) {
        if (file.endsWith('.json')) {
            const content = await fs.readFile(file, 'utf-8');
            try {
                const place = JSON.parse(content);
                // Add id from filename if not present or just to be sure, 
                // but usually id is in the file or filename. 
                // Let's assume the file content has the id or we derive it?
                // The schema says id is required in spec.
                // But the file structure is `data/places/province/place.json`.
                // Let's trust the content for now, but we might need to normalize IDs.
                // Actually, places.json schema says id is in spec.id.
                // And the ID used in references is usually `province/id` or just `id`?
                // In `MiniMap.astro`, it handles `province/` prefix.
                // Let's construct the ID as `province/id` if it's not fully qualified?
                // Wait, `places.json` spec.id is just the slug.
                // The file path is `.../province/slug.json`.
                // The ID used in relationships is usually `province/slug`?
                // Let's check how `getCollection` returns IDs. It returns the relative path without extension.
                // So for `data/places/azilal/foo.json`, the ID is `azilal/foo`.

                const relativePath = path.relative(PLACES_DIR, file);
                const id = relativePath.replace(/\.json$/, '');

                // Inject the collection ID
                place.id = id;
                places.push(place);
            } catch (e) {
                console.error(`Error parsing ${file}:`, e);
            }
        }
    }
    return places;
}

async function loadMaps(): Promise<MapData[]> {
    const files = await fs.readdir(MAPS_DIR);
    const maps: MapData[] = [];
    for (const file of files) {
        if (file.endsWith('.json')) {
            const content = await fs.readFile(path.join(MAPS_DIR, file), 'utf-8');
            try {
                maps.push(JSON.parse(content));
            } catch (e) {
                console.error(`Error parsing ${file}:`, e);
            }
        }
    }
    return maps;
}

async function buildMaps() {
    console.log('🏗️ Building maps...');

    const places = await loadPlaces();
    const maps = await loadMaps();

    console.log(`Loaded ${places.length} places.`);
    console.log(`Loaded ${maps.length} maps.`);

    const output: Record<string, any> = {};

    for (const map of maps) {
        const { id, title, description, strategy, content } = map.spec;
        console.log(`Processing map: ${id}, strategy: ${strategy}`);
        const tags = map.metadata?.tags || [];

        let selectedPlaces: Place[] = [];

        if (strategy === 'explicit' || strategy === 'mixed') {
            if (content.ids) {
                const explicitPlaces = places.filter(p => content.ids!.includes(p.id));
                selectedPlaces.push(...explicitPlaces);
            }
        }

        if (strategy === 'query' || strategy === 'mixed') {
            if (content.query) {
                // JMESPath search
                // We need to reshape places to match what JMESPath expects if needed,
                // or just run the query against the list of places.
                // The query examples are `location.province == ...` or `kind == ...`.
                // These properties are inside `spec` or `kind` at root.
                // My `Place` interface has `kind` at root and `spec` at root.
                // However, the query `location.province` implies `location` is at root of the object being queried?
                // Or maybe `spec.location.province`?
                // The user examples: `location.province == 'province/casablanca'`
                // In `places.json`, `location` is inside `spec`.
                // So the query should probably be `spec.location.province`.
                // BUT, the user wrote `location.province` in the examples.
                // I should probably flatten the object for the query or adjust the query.
                // Let's adjust the object passed to JMESPath to make `location` available at root if that's what the query expects.
                // Or better, let's map the place to a structure that matches the query expectations.
                // If the user wrote `location.province`, they probably expect a flattened structure or I need to fix the queries.
                // Wait, I wrote the queries! I wrote `location.province == ...`.
                // I should probably have written `spec.location.province == ...` if I'm querying the raw JSON.
                // OR, I can map the place object to have `location` at the top level.

                // Let's create a queryable object for each place.
                const queryablePlaces = places.map(p => ({
                    ...p,
                    location: p.spec.location,
                    ...p.spec, // Spread spec to top level
                    _id: p.id // Preserve collection ID explicitly
                }));

                const result = jmespath.search(queryablePlaces, `[?${content.query}]`);
                // result is an array of matching place objects (the queryable ones)

                // We need to map back to the original places or just extract IDs.
                // Since we spread spec, `id` is still there (from `p.id` which I injected).

                if (Array.isArray(result)) {
                    // Use _id for matching back to original places
                    const matchedIds = new Set(result.map((p: any) => p._id));
                    const matchedPlaces = places.filter(p => matchedIds.has(p.id));
                    selectedPlaces.push(...matchedPlaces);
                }
            }
        }

        // Deduplicate
        selectedPlaces = Array.from(new Set(selectedPlaces.map(p => p.id)))
            .map(id => selectedPlaces.find(p => p.id === id)!);

        // Map to output format
        // We want to include minimal data for the map component to avoid fetching all places again?
        // The user said: "The Astro maps component should be refactored, they should accept Maps with place ids... Then the maps is content should have the id of the map and the map should be pulled and the ids should be gotten from there and passed to the map component."
        // This implies the map component might still fetch place details?
        // "The Astro maps component should be refactored, they should accept Maps with place ids"
        // "Then the maps is content should have the id of the map and the map should be pulled and the ids should be gotten from there and passed to the map component."
        // "The other attributes in the frontmatter should be gotten from the map json."

        // If I just pass IDs, the component still needs to `getCollection('places')` and filter.
        // That's fine, it's what it does now.
        // So the generated JSON just needs the list of IDs.

        output[id] = {
            id,
            title,
            description,
            tags,
            placeIds: selectedPlaces.map(p => p.id)
        };
    }

    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`✅ Generated maps data to ${OUTPUT_FILE}`);
}

buildMaps().catch(console.error);
