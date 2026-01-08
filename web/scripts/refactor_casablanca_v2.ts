import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const CASABLANCA_DIR = 'src/data/places/casablanca'; // Relative to where script is run (usually root)
// Adjusting path to match where I'll run it from (core/web) or absolute path
const ABS_CASABLANCA_DIR = '/home/guru/Desktop/idspace/agora/Mrrakc/core/data/places/casablanca';

async function refactorCasablanca() {
    const files = await Array.fromAsync(new Bun.Glob('*.json').scan({ cwd: ABS_CASABLANCA_DIR, absolute: true }));
    console.log(`Found ${files.length} files in ${ABS_CASABLANCA_DIR}`);

    for (const file of files) {
        try {
            const content = await readFile(file, 'utf-8');
            const json = JSON.parse(content);

            if (!json.spec || !json.spec.description) continue;

            let description = json.spec.description;
            if (!description.includes('🔻')) continue;

            console.log(`Processing ${file}...`);

            const lines = description.split('<br>');
            const newLines: string[] = [];
            let modified = false;

            // Initialize arrays if they don't exist
            if (!json.spec.people) json.spec.people = [];
            if (!json.spec.timeline) json.spec.timeline = [];
            if (!json.metadata) json.metadata = {};
            if (!json.metadata.tags) json.metadata.tags = [];
            if (!json.spec.comments) json.spec.comments = [];

            for (const line of lines) {
                const trimmedLine = line.trim();

                if (trimmedLine.startsWith('🔻 Architect:')) {
                    const architectName = trimmedLine.replace('🔻 Architect:', '').trim();
                    if (architectName) {
                        // Check if already exists to avoid duplicates
                        const exists = json.spec.people.some((p: any) => p.id === `people/${slugify(architectName)}`);
                        if (!exists) {
                            json.spec.people.push({
                                id: `people/${slugify(architectName)}`,
                                relationship: ['Architect']
                            });
                        }
                    }
                    modified = true;
                } else if (trimmedLine.startsWith('🔻 Dates:')) {
                    const dateStr = trimmedLine.replace('🔻 Dates:', '').trim();
                    if (dateStr) {
                        // Check if already exists
                        const exists = json.spec.timeline.some((t: any) => t.title === 'Construction' || t.title === 'Date');
                        if (!exists) {
                            json.spec.timeline.push({
                                title: 'Date',
                                date: dateStr,
                                description: `Associated date: ${dateStr}`
                            });
                        }
                    }
                    modified = true;
                } else if (trimmedLine.startsWith('🔻 National Material Patrimony Declaration:')) {
                    const declDate = trimmedLine.replace('🔻 National Material Patrimony Declaration:', '').trim();
                    if (!json.metadata.tags.includes('National Material Patrimony')) {
                        json.metadata.tags.push('National Material Patrimony');
                    }
                    if (declDate) {
                        json.spec.timeline.push({
                            title: 'National Material Patrimony Declaration',
                            date: declDate,
                            description: 'Declared as National Material Patrimony'
                        });
                    }
                    modified = true;
                } else if (trimmedLine.startsWith('🔻 Current Status:')) {
                    // Keep Current Status in description or move to comments? 
                    // Request said "move the data to proper place". 
                    // Usually "Current Status" is part of description.
                    // But let's see if we can make it cleaner.
                    // The previous script kept it in description.
                    // Let's keep it in description but format it nicely if it's the only thing left.
                    newLines.push(trimmedLine.replace('🔻 ', ''));
                    modified = true;
                } else if (trimmedLine.startsWith('🔻 Comments:')) {
                    const comment = trimmedLine.replace('🔻 Comments:', '').trim();
                    if (comment) {
                        json.spec.comments.push({
                            content: comment,
                            author: "System", // Or unknown
                            date: new Date().toISOString().split('T')[0]
                        });
                    }
                    modified = true;
                } else if (trimmedLine.startsWith('---') || trimmedLine.startsWith('🔗')) {
                    // Keep links? The request didn't specify links.
                    // Usually links are at the bottom.
                    // Let's keep them in description for now or move to links if schema supports it.
                    // Schema has "links" array.
                    if (trimmedLine.startsWith('🔗')) {
                        const linkUrl = trimmedLine.replace('🔗', '').trim();
                        if (!json.spec.links) json.spec.links = [];
                        json.spec.links.push({
                            url: linkUrl,
                            title: "Source"
                        });
                        modified = true;
                    } else {
                        // Ignore separator
                        modified = true;
                    }
                }
                else {
                    newLines.push(trimmedLine);
                }
            }

            if (modified) {
                json.spec.description = newLines.join('<br>').trim();
                if (json.spec.description === '') {
                    json.spec.description = 'No description available.';
                }
                // Clean up empty arrays if we created them and didn't use them
                if (json.spec.people.length === 0) delete json.spec.people;
                if (json.spec.timeline.length === 0) delete json.spec.timeline;
                if (json.spec.comments.length === 0) delete json.spec.comments;
                if (json.spec.links && json.spec.links.length === 0) delete json.spec.links;


                await writeFile(file, JSON.stringify(json, null, 2));
                console.log(`Updated ${file}`);
            }

        } catch (e) {
            console.error(`Error processing ${file}:`, e);
        }
    }
}

function slugify(text: string): string {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

refactorCasablanca();
