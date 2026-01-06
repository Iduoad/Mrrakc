import { Glob } from "bun";
import path from 'path';
import fs from 'fs/promises';

async function main() {
    const glob = new Glob("**/*.json");
    const dataDir = path.resolve(import.meta.dir, '../../data/places/casablanca');

    console.log(`Scanning directory: ${dataDir}`);

    let count = 0;

    for await (const file of glob.scan({ cwd: dataDir })) {
        const filePath = path.join(dataDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        let data;
        try {
            data = JSON.parse(content);
        } catch (e) {
            console.error(`Error parsing ${file}:`, e);
            continue;
        }

        if (data.spec && data.spec.description && data.spec.description.includes("Architect:")) {
            const desc = data.spec.description;
            const parts = desc.split('<br>');

            let architect = "";
            let date = "";
            let status = "";
            let patrimony = false;

            let patrimonyDate = "";

            for (const part of parts) {
                if (part.includes("Architect:")) {
                    architect = part.replace("🔻 Architect:", "").trim();
                } else if (part.includes("Dates:")) {
                    date = part.replace("🔻 Dates:", "").trim();
                } else if (part.includes("Current Status:")) {
                    status = part.replace("🔻 Current Status:", "").trim();
                } else if (part.includes("National Material Patrimony Declaration:")) {
                    patrimony = true;
                    patrimonyDate = part.replace("🔻 National Material Patrimony Declaration:", "").trim();
                }
            }

            // Process Architect
            if (architect) {
                if (!data.spec.people) data.spec.people = [];
                // Handle multiple architects separated by "&" or ","
                const architects = architect.split(/&|,/).map(a => a.trim());

                for (const arch of architects) {
                    const id = `people/${arch.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                    if (!data.spec.people.find(p => p.id === id)) {
                        data.spec.people.push({
                            id: id,
                            relationship: ["Architect"]
                        });
                    }
                }
            }

            // Process Date
            if (date) {
                if (!data.spec.timeline) data.spec.timeline = [];
                if (!data.spec.timeline.find(t => t.title === "Construction")) {
                    data.spec.timeline.push({
                        title: "Construction",
                        date: date,
                        description: `Built in ${date}`
                    });
                }

                // Process Era (Century)
                if (!data.spec.timePeriods) data.spec.timePeriods = [];
                const yearMatch = date.match(/\d{4}/);
                if (yearMatch) {
                    const year = parseInt(yearMatch[0]);
                    const century = Math.ceil(year / 100);
                    const era = `${century}th Century`;
                    if (!data.spec.timePeriods.includes(era)) {
                        data.spec.timePeriods.push(era);
                    }
                } else if (date.includes("1920s")) {
                    if (!data.spec.timePeriods.includes("20th Century")) {
                        data.spec.timePeriods.push("20th Century");
                    }
                }
            }

            // Process Patrimony
            if (patrimony) {
                if (!data.metadata) data.metadata = {};
                if (!data.metadata.tags) data.metadata.tags = [];
                if (!data.metadata.tags.includes("National Material Patrimony")) {
                    data.metadata.tags.push("National Material Patrimony");
                }

                if (patrimonyDate) {
                    if (!data.spec.timeline) data.spec.timeline = [];
                    if (!data.spec.timeline.find(t => t.title === "National Material Patrimony Declaration")) {
                        data.spec.timeline.push({
                            title: "National Material Patrimony Declaration",
                            date: patrimonyDate,
                            description: `Declared National Material Patrimony in ${patrimonyDate}`
                        });
                    }
                }
            }

            // Update Description
            // Keep only parts that were NOT extracted? Or just clear it?
            // The user request implies moving them, so likely we should remove them from description.
            // But "Current Status" wasn't explicitly asked to be moved, but it's part of the block.
            // Let's keep "Current Status" in description if it exists, otherwise "No description available".

            if (status) {
                data.spec.description = `Current Status: ${status}`;
            } else {
                data.spec.description = "No description available";
            }

            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            console.log(`Updated ${file}`);
            count++;
        }
    }
    console.log(`Processed ${count} files.`);
}

main().catch(console.error);
