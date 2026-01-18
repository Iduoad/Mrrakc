import { Glob } from "bun";
import path from 'path';
import fs from 'fs/promises';

async function main() {
    const glob = new Glob("**/*.json");
    // Resolve path relative to this script file
    // __dirname in Bun is the directory of the executed file
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

        if (data.kind === 'nature/mountain' && data.spec && data.spec.description) {
            const desc = data.spec.description;
            // Regex to match "City <br>Mountain Chain: Chain"
            // Using case insensitive match just in case
            const match = desc.match(/^(.*?) <br>Mountain Chain: (.*)$/i);

            if (match) {
                const city = match[1].trim();
                const chain = match[2].trim();

                if (!data.metadata) {
                    data.metadata = {};
                }
                if (!data.metadata.tags) {
                    data.metadata.tags = [];
                }

                if (!data.metadata.tags.includes(city)) {
                    data.metadata.tags.push(city);
                }
                if (!data.metadata.tags.includes(chain)) {
                    data.metadata.tags.push(chain);
                }

                data.spec.description = "No description available";

                await fs.writeFile(filePath, JSON.stringify(data, null, 2));
                console.log(`Updated ${file}: Added tags "${city}", "${chain}"`);
                count++;
            }
        }
    }
    console.log(`Processed ${count} files.`);
}

main().catch(console.error);
