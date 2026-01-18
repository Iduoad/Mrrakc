import fs from 'node:fs/promises';
import path from 'node:path';
import jmespath from 'jmespath';

import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const MAPS_DIR = path.join(DATA_DIR, 'maps');
const PLACES_DIR = path.join(DATA_DIR, 'places');
const PEOPLE_DIR = path.join(DATA_DIR, 'people');
const PLANS_DIR = path.join(DATA_DIR, 'plans');
const OUTPUT_MAPS_FILE = path.resolve(__dirname, '../src/data/generated/maps.json');
const OUTPUT_PLANS_FILE = path.resolve(__dirname, '../src/data/generated/plans.json');

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

interface Person {
    id: string;
    kind: string;
    spec: {
        name: string;
        role: string;
        bio?: string;
        [key: string]: any;
    };
    [key: string]: any;
}

interface Plan {
    id: string;
    kind: string;
    spec: {
        id: string;
        title: string;
        description?: string;
        pubDate?: string;
        estimatedDuration: {
            value: number;
            unit: string;
        };
        difficulty: string;
        steps: Step[];
        [key: string]: any;
    };
    [key: string]: any;
}

interface Step {
    title: string;
    description?: string;
    type: string;
    optional?: boolean;
    placeIds?: string[];
    places?: Place[]; // Resolved places
    people?: {
        id: string;
        role: string;
        details?: Person; // Resolved person
    }[];
    transportToNext?: {
        mode: string;
        durationMin: number;
        advice?: string;
    };
    subSteps?: Step[];
}

async function getFiles(dir: string): Promise<string[]> {
    try {
        const dirents = await fs.readdir(dir, { withFileTypes: true });
        const files = await Promise.all(dirents.map((dirent) => {
            const res = path.resolve(dir, dirent.name);
            return dirent.isDirectory() ? getFiles(res) : res;
        }));
        return Array.prototype.concat(...files);
    } catch (e) {
        // Directory might not exist (e.g. plans if empty)
        return [];
    }
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
                // Also ensure ID is prefixed with 'places/' for matching if needed, 
                // but the ID in references is usually `places/province/id` or just `province/id`.
                // The references in plans are `places/province/id`.
                // My `id` here is `province/id`.
                // So I need to handle the `places/` prefix when matching.
                places.push(place);
            } catch (e) {
                console.error(`Error parsing ${file}:`, e);
            }
        }
    }
    return places;
}

async function loadPeople(): Promise<Person[]> {
    const files = await getFiles(PEOPLE_DIR);
    const people: Person[] = [];
    for (const file of files) {
        if (file.endsWith('.json')) {
            const content = await fs.readFile(file, 'utf-8');
            try {
                const person = JSON.parse(content);
                const relativePath = path.relative(PEOPLE_DIR, file);
                const id = relativePath.replace(/\.json$/, '');
                person.id = id;
                // ID here is likely just the filename base if flat, or relative path.
                // People dir seems flat based on `list_dir` output earlier?
                // Wait, `list_dir` showed `people.json` in schema, but I didn't list `data/people` content fully.
                // I listed `data/people` and it had files like `mohammed-sanhaji.json`.
                // So ID is `mohammed-sanhaji`.
                // References are `people/mohammed-sanhaji`.
                people.push(person);
            } catch (e) {
                console.error(`Error parsing ${file}:`, e);
            }
        }
    }
    return people;
}

async function loadPlans(): Promise<Plan[]> {
    const files = await getFiles(PLANS_DIR);
    const plans: Plan[] = [];
    for (const file of files) {
        if (file.endsWith('.json')) {
            const content = await fs.readFile(file, 'utf-8');
            try {
                const plan = JSON.parse(content);
                const relativePath = path.relative(PLANS_DIR, file);
                const id = relativePath.replace(/\.json$/, '');
                plan.id = id;
                plans.push(plan);
            } catch (e) {
                console.error(`Error parsing ${file}:`, e);
            }
        }
    }
    return plans;
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

function resolveStep(step: Step, places: Place[], people: Person[]) {
    // Resolve places
    if (step.placeIds) {
        step.places = step.placeIds.map(refId => {
            // refId is like "places/province/id"
            // place.id is like "province/id"
            const cleanId = refId.replace(/^places\//, '');
            return places.find(p => p.id === cleanId);
        }).filter((p): p is Place => !!p);
    }

    // Resolve people
    if (step.people) {
        step.people.forEach(pRef => {
            // pRef.id is like "people/id"
            // person.id is like "id"
            const cleanId = pRef.id.replace(/^people\//, '');
            pRef.details = people.find(p => p.id === cleanId);
        });
    }

    // Recurse
    if (step.subSteps) {
        step.subSteps.forEach(subStep => resolveStep(subStep, places, people));
    }
}

async function buildData() {
    console.log('🏗️ Building data...');

    const places = await loadPlaces();
    const maps = await loadMaps();
    const people = await loadPeople();
    const plans = await loadPlans();

    console.log(`Loaded ${places.length} places.`);
    console.log(`Loaded ${maps.length} maps.`);
    console.log(`Loaded ${people.length} people.`);
    console.log(`Loaded ${plans.length} plans.`);

    // --- Build Maps ---
    const mapsOutput: Record<string, any> = {};

    for (const map of maps) {
        const { id, title, description, strategy, content } = map.spec;
        // console.log(`Processing map: ${id}, strategy: ${strategy}`);
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
                    ...p.spec, // Spread spec to top level (includes location)
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

        mapsOutput[id] = {
            id,
            title,
            description,
            tags,
            placeIds: selectedPlaces.map(p => p.id)
        };
    }

    await fs.mkdir(path.dirname(OUTPUT_MAPS_FILE), { recursive: true });
    await fs.writeFile(OUTPUT_MAPS_FILE, JSON.stringify(mapsOutput, null, 2));
    console.log(`✅ Generated maps data to ${OUTPUT_MAPS_FILE}`);

    // --- Build Plans ---
    const plansOutput: Record<string, Plan> = {};
    const CONTENT_PLANS_DIR = path.resolve(__dirname, '../src/content/plans');
    const contentFiles = await getFiles(CONTENT_PLANS_DIR);
    const validPlanIds = new Set(contentFiles.map(f => path.basename(f, path.extname(f))));

    for (const plan of plans) {
        if (!validPlanIds.has(plan.id)) {
            console.log(`Skipping plan ${plan.id} (no content found)`);
            continue;
        }

        // Deep copy to avoid mutating original if we were caching, but here it's fine
        // Resolve references
        if (plan.spec.steps) {
            plan.spec.steps.forEach(step => resolveStep(step, places, people));
        }
        plansOutput[plan.id] = plan;
    }

    await fs.mkdir(path.dirname(OUTPUT_PLANS_FILE), { recursive: true });
    await fs.writeFile(OUTPUT_PLANS_FILE, JSON.stringify(plansOutput, null, 2));
    console.log(`✅ Generated plans data to ${OUTPUT_PLANS_FILE}`);
}

buildData().catch(console.error);
