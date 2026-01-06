import { Glob } from "bun";
import path from 'path';
import fs from 'fs/promises';

async function main() {
    const glob = new Glob("**/*.json");
    const dataDir = path.resolve(import.meta.dir, '../../data/places');

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

        if (data.kind === 'nature/mountain' && data.metadata && data.metadata.tags) {
            const tags = data.metadata.tags;
            let akaTagIndex = -1;
            let akaTag = "";

            for (let i = 0; i < tags.length; i++) {
                if (tags[i].startsWith("AKA ")) {
                    akaTagIndex = i;
                    akaTag = tags[i];
                    break;
                }
            }

            if (akaTagIndex !== -1) {
                // Format: "AKA [Name]<br>[City]"
                const parts = akaTag.split('<br>');
                if (parts.length === 2) {
                    const akaName = parts[0].replace("AKA ", "").trim();
                    const city = parts[1].trim();

                    // Remove the old tag
                    data.metadata.tags.splice(akaTagIndex, 1);

                    // Add the city tag if not present
                    if (!data.metadata.tags.includes(city)) {
                        data.metadata.tags.push(city);
                    }

                    // Update description
                    data.spec.description = `AKA ${akaName}`;

                    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
                    console.log(`Updated ${file}: Set description to "AKA ${akaName}" and added tag "${city}"`);
                    count++;
                }
            }
        }
    }
    console.log(`Processed ${count} files.`);
}

main().catch(console.error);
