import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '../..');

console.log('\n🧪 Running test suite...\n');

let passCount = 0;
let failCount = 0;

function runTest(name, fn) {
  try {
    process.stdout.write(`  • ${name} ... `);
    fn();
    console.log('✅ PASSED');
    passCount++;
  } catch (err) {
    console.log('❌ FAILED');
    console.error(`    ${err.message}`);
    failCount++;
  }
}

// Test 1: Event Kinds Enum
let validKinds = [];
runTest('Event kind enums schema load', () => {
  const enumPath = path.join(repoRoot, 'schema', 'enums', 'event-kinds.json');
  if (!fs.existsSync(enumPath)) throw new Error(`Enum file not found: ${enumPath}`);
  const data = JSON.parse(fs.readFileSync(enumPath, 'utf8'));
  if (!Array.isArray(data.enum) || data.enum.length === 0) {
    throw new Error('Invalid enum array in event-kinds.json');
  }
  validKinds = data.enum;
});

// Test 2: Validate all Event JSON files
runTest(`Validate all events (${path.join('data', 'events')})`, () => {
  const eventsDir = path.join(repoRoot, 'data', 'events');
  const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) throw new Error('No event JSON files found!');

  const errors = [];
  for (const file of files) {
    const filePath = path.join(eventsDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const expectedId = file.replace('.json', '');

      if (!data.kind) errors.push(`${file}: missing kind`);
      else if (!validKinds.includes(data.kind)) errors.push(`${file}: invalid kind '${data.kind}'`);

      if (!data.spec) {
        errors.push(`${file}: missing spec`);
        continue;
      }

      if (data.spec.id !== expectedId) {
        errors.push(`${file}: spec.id '${data.spec.id}' does not match filename '${expectedId}'`);
      }
      if (!data.spec.name || typeof data.spec.name !== 'string') {
        errors.push(`${file}: missing or invalid spec.name`);
      }
      if (!['active', 'unknown', 'discontinued'].includes(data.spec.status)) {
        errors.push(`${file}: invalid status '${data.spec.status}'`);
      }
      if (!data.spec.host?.provinces || !Array.isArray(data.spec.host.provinces) || data.spec.host.provinces.length === 0) {
        errors.push(`${file}: missing host.provinces`);
      }
      if (!data.spec.recurrence?.type) {
        errors.push(`${file}: missing recurrence.type`);
      }
    } catch (e) {
      errors.push(`${file}: JSON parse error: ${e.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Found ${errors.length} validation errors:\n    - ${errors.slice(0, 10).join('\n    - ')}`);
  }
});

// Test 3: Data maps and plans generation
runTest('Prebuild data generator (scripts/build_maps.ts)', () => {
  execSync('node scripts/build_maps.ts', { cwd: webRoot, stdio: 'pipe' });
  const mapsOut = path.join(webRoot, 'src', 'data', 'generated', 'maps.json');
  const plansOut = path.join(webRoot, 'src', 'data', 'generated', 'plans.json');
  if (!fs.existsSync(mapsOut)) throw new Error('maps.json was not generated');
  if (!fs.existsSync(plansOut)) throw new Error('plans.json was not generated');
});

// Test 4: TypeScript type check on Agenda component
runTest('TypeScript type-check for AgendaCalendar', () => {
  execSync(
    'npx tsc --noEmit --jsx react-jsx --target es2022 --module es2022 --moduleResolution node --esModuleInterop --skipLibCheck src/components/react/AgendaCalendar.tsx',
    { cwd: webRoot, stdio: 'pipe' }
  );
});

console.log(`\nResults: ${passCount} passed, ${failCount} failed.\n`);

if (failCount > 0) {
  process.exit(1);
}
