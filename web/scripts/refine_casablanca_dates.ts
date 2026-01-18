import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const ABS_CASABLANCA_DIR = '/home/guru/Desktop/idspace/agora/Mrrakc/core/data/places/casablanca';

async function refineCasablancaDates() {
    const files = await Array.fromAsync(new Bun.Glob('*.json').scan({ cwd: ABS_CASABLANCA_DIR, absolute: true }));
    console.log(`Found ${files.length} files in ${ABS_CASABLANCA_DIR}`);

    for (const file of files) {
        try {
            const content = await readFile(file, 'utf-8');
            const json = JSON.parse(content);
            let modified = false;

            if (json.spec && json.spec.timeline) {
                for (const event of json.spec.timeline) {
                    if (event.title === 'Date') {
                        event.title = 'Construction';
                        event.description = 'Construction date';

                        let dateStr = event.date;
                        let century = '';

                        // Handle YYYY format
                        if (/^\d{4}$/.test(dateStr)) {
                            const year = parseInt(dateStr);
                            century = `${Math.ceil(year / 100)}th Century`;
                            event.date = `${dateStr}-01-01`;
                        } else if (dateStr.toLowerCase().includes('century')) {
                            // Try to extract century from string like "19th century"
                            const match = dateStr.match(/(\d+)(?:st|nd|rd|th)?\s+century/i);
                            if (match) {
                                century = `${match[1]}th Century`;
                            }
                        }

                        if (century) {
                            if (!json.spec.timePeriods) json.spec.timePeriods = [];
                            if (!json.spec.timePeriods.includes(century)) {
                                json.spec.timePeriods.push(century);
                            }
                        }
                        modified = true;
                    }
                }
            }

            if (modified) {
                await writeFile(file, JSON.stringify(json, null, 2));
                console.log(`Updated ${file}`);
            }

        } catch (e) {
            console.error(`Error processing ${file}:`, e);
        }
    }
}

refineCasablancaDates();
