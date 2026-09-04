import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '../..');

console.log('\n🔍 Running linter checks...\n');

let passCount = 0;
let failCount = 0;

function runLint(name, fn) {
  try {
    process.stdout.write(`  • ${name} ... `);
    fn();
    console.log('✅ OK');
    passCount++;
  } catch (err) {
    console.log('❌ LINT ERROR');
    console.error(`    ${err.message}`);
    failCount++;
  }
}

// 1. Lint Event JSON formatting & syntax
runLint('Lint event JSON files syntax & structure', () => {
  const eventsDir = path.join(repoRoot, 'data', 'events');
  const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.json'));
  const issues = [];
  for (const file of files) {
    const fullPath = path.join(eventsDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    try {
      JSON.parse(content);
    } catch (e) {
      issues.push(`${file}: invalid JSON (${e.message})`);
    }
  }
  if (issues.length > 0) {
    throw new Error(`Found ${issues.length} JSON syntax issues:\n` + issues.slice(0, 5).join('\n'));
  }
});

// 2. TypeScript static type & syntax lint
runLint('Lint React components TypeScript syntax (AgendaCalendar)', () => {
  execSync(
    'npx tsc --noEmit --jsx react-jsx --target es2022 --module es2022 --moduleResolution node --esModuleInterop --skipLibCheck src/components/react/AgendaCalendar.tsx',
    { cwd: webRoot, stdio: 'pipe' }
  );
});

// 3. Lint Content Config
runLint('Lint content collection config (src/content/config.ts)', () => {
  execSync(
    'npx tsc --noEmit --target es2022 --module es2022 --moduleResolution bundler --esModuleInterop --skipLibCheck .astro/types.d.ts src/content/config.ts',
    { cwd: webRoot, stdio: 'pipe' }
  );
});

console.log(`\nLint results: ${passCount} passed, ${failCount} failed.\n`);

if (failCount > 0) {
  process.exit(1);
}
