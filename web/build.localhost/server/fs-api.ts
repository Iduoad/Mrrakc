import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Plugin, Connect } from 'vite';

/**
 * Local filesystem API backing the tools in build.localhost.
 *
 * Every tool reads and writes the repo's own `data/` tree through these
 * routes, so a save from the browser is a plain edit to a tracked JSON file.
 * The app never ships anywhere, so this runs on the dev server only.
 *
 * Routes are grouped per data type; add a new group below as each data type
 * gets its first tool. A couple of groups back working material that lives
 * outside `data/` — see the drafts and review-state constants.
 */

// Repo layout: this app lives at web/build.localhost, the dataset at data/.
const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const DATA_ROOT = path.join(REPO_ROOT, 'data');
const PLACES_DIR = path.join(DATA_ROOT, 'places');
const EVENTS_DIR = path.join(DATA_ROOT, 'events');

// Source drafts for events that are not in the dataset yet: working material
// for a later research pass, not dataset content, so they sit outside data/
// and outside git (see the repo's .gitignore).
const EVENT_DRAFTS_DIR = path.join(REPO_ROOT, 'sources', 'new-events');

// Reviewer bookkeeping, not dataset content: which records a maintainer has
// looked at and accepted. Kept under the app's already-ignored .tmp/, so it
// never shows up in git status. Created on first write.
const REVIEW_STATE_FILE = path.resolve(import.meta.dirname, '../.tmp/review-state.json');

const SLUG = /^[a-z0-9-]+$/;

type Req = Connect.IncomingMessage;
type Res = import('node:http').ServerResponse;

function sendJson(res: Res, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readBody(req: Req): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Join user-supplied slugs onto a base directory. The slug check already
// rules out `.`, `..` and separators, so this only ever descends.
function safeDir(baseDir: string, ...segments: string[]): string | null {
  if (segments.some((s) => !s || !SLUG.test(s))) return null;
  return path.join(baseDir, ...segments);
}

// Same, but the last segment names a `.json` file rather than a directory.
function safeFile(baseDir: string, ...segments: string[]): string | null {
  const dir = safeDir(baseDir, ...segments);
  return dir && `${dir}.json`;
}

async function writeJson(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

// --- Places ----------------------------------------------------------------

// Provinces are the directories under data/places, with their place count.
async function listPlaceProvinces() {
  const entries = await fs.readdir(PLACES_DIR, { withFileTypes: true });
  const provinces: { id: string; count: number }[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const files = await fs.readdir(path.join(PLACES_DIR, entry.name));
    provinces.push({ id: entry.name, count: files.filter((f) => f.endsWith('.json')).length });
  }
  provinces.sort((a, b) => a.id.localeCompare(b.id));
  return provinces;
}

async function listPlaces(province: string) {
  const provinceDir = safeDir(PLACES_DIR, province);
  if (!provinceDir) throw new Error('invalid province');
  const files = await fs.readdir(provinceDir);
  const places: { place: unknown; file: string }[] = [];
  const errors: { file: string; error: string }[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const rel = `${province}/${f}`;
    try {
      const raw = await fs.readFile(path.join(provinceDir, f), 'utf8');
      places.push({ place: JSON.parse(raw), file: rel });
    } catch (e) {
      errors.push({ file: rel, error: (e as Error).message });
    }
  }
  return { places, errors };
}

// --- Events ----------------------------------------------------------------

async function listEvents() {
  const events: { event: unknown; file: string }[] = [];
  const errors: { file: string; error: string }[] = [];
  for (const f of await fs.readdir(EVENTS_DIR)) {
    if (!f.endsWith('.json')) continue;
    try {
      const raw = await fs.readFile(path.join(EVENTS_DIR, f), 'utf8');
      events.push({ event: JSON.parse(raw), file: f });
    } catch (e) {
      errors.push({ file: f, error: (e as Error).message });
    }
  }
  return { events, errors };
}

// --- Event source drafts ---------------------------------------------------

async function listEventDrafts() {
  const drafts: { draft: unknown; file: string }[] = [];
  const errors: { file: string; error: string }[] = [];
  let files: string[];
  try {
    files = await fs.readdir(EVENT_DRAFTS_DIR);
  } catch {
    // Nothing drafted yet — the directory is created on first save.
    return { drafts, errors };
  }
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const raw = await fs.readFile(path.join(EVENT_DRAFTS_DIR, f), 'utf8');
      drafts.push({ draft: JSON.parse(raw), file: f });
    } catch (e) {
      errors.push({ file: f, error: (e as Error).message });
    }
  }
  return { drafts, errors };
}

export function dataFsPlugin(): Plugin {
  return {
    name: 'mrrakc-data-fs',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        try {
          const url = new URL(req.url || '', 'http://localhost');
          const route = url.pathname; // relative to the /api mount

          // --- Places ------------------------------------------------------

          if (route === '/places/provinces' && req.method === 'GET') {
            return sendJson(res, 200, { provinces: await listPlaceProvinces() });
          }

          if (route === '/places' && req.method === 'GET') {
            const province = url.searchParams.get('province') || '';
            if (!SLUG.test(province)) {
              return sendJson(res, 400, { error: 'invalid or missing province' });
            }
            return sendJson(res, 200, await listPlaces(province));
          }

          if (route === '/places' && req.method === 'PUT') {
            const { province, id, place, prev } = JSON.parse(await readBody(req)) as {
              province: string; id: string; place: unknown;
              prev?: { province: string; id: string };
            };
            const file = safeFile(PLACES_DIR, province, id);
            if (!file || !place) {
              return sendJson(res, 400, { error: 'invalid province/id/place' });
            }
            await writeJson(file, place);

            // Rename/move: drop the old file if the id or province changed.
            if (prev && (prev.province !== province || prev.id !== id)) {
              const oldFile = safeFile(PLACES_DIR, prev.province, prev.id);
              if (oldFile && oldFile !== file) await fs.rm(oldFile, { force: true });
            }
            return sendJson(res, 200, { ok: true, file: `${province}/${id}.json` });
          }

          if (route === '/places' && req.method === 'DELETE') {
            const file = safeFile(
              PLACES_DIR,
              url.searchParams.get('province') || '',
              url.searchParams.get('id') || '',
            );
            if (!file) return sendJson(res, 400, { error: 'invalid province/id' });
            await fs.rm(file, { force: true });
            return sendJson(res, 200, { ok: true });
          }

          // --- Events ------------------------------------------------------

          if (route === '/events' && req.method === 'GET') {
            return sendJson(res, 200, await listEvents());
          }

          if (route === '/events' && req.method === 'PUT') {
            const { id, event } = JSON.parse(await readBody(req)) as {
              id: string; event: unknown;
            };
            const file = safeFile(EVENTS_DIR, id);
            if (!file || !event) return sendJson(res, 400, { error: 'invalid id/event' });
            await writeJson(file, event);
            return sendJson(res, 200, { ok: true, file: `${id}.json` });
          }

          // --- Event source drafts -----------------------------------------

          if (route === '/event-drafts' && req.method === 'GET') {
            return sendJson(res, 200, await listEventDrafts());
          }

          if (route === '/event-drafts' && req.method === 'PUT') {
            const { id, draft, prevId } = JSON.parse(await readBody(req)) as {
              id: string; draft: unknown; prevId?: string;
            };
            const file = safeFile(EVENT_DRAFTS_DIR, id);
            if (!file || !draft) return sendJson(res, 400, { error: 'invalid id/draft' });
            await writeJson(file, draft);

            // Renaming a draft moves its file, so the id stays the filename.
            if (prevId && prevId !== id) {
              const oldFile = safeFile(EVENT_DRAFTS_DIR, prevId);
              if (oldFile && oldFile !== file) await fs.rm(oldFile, { force: true });
            }
            return sendJson(res, 200, { ok: true, file: `${id}.json` });
          }

          if (route === '/event-drafts' && req.method === 'DELETE') {
            const file = safeFile(EVENT_DRAFTS_DIR, url.searchParams.get('id') || '');
            if (!file) return sendJson(res, 400, { error: 'invalid id' });
            await fs.rm(file, { force: true });
            return sendJson(res, 200, { ok: true });
          }

          // --- Review state ------------------------------------------------

          if (route === '/review-state' && req.method === 'GET') {
            try {
              const raw = await fs.readFile(REVIEW_STATE_FILE, 'utf8');
              return sendJson(res, 200, JSON.parse(raw));
            } catch {
              // Absent or unreadable: start from a blank slate rather than fail.
              return sendJson(res, 200, { version: 1, events: {} });
            }
          }

          if (route === '/review-state' && req.method === 'PUT') {
            const state = JSON.parse(await readBody(req));
            if (!state || typeof state !== 'object' || typeof state.events !== 'object') {
              return sendJson(res, 400, { error: 'invalid review state' });
            }
            await writeJson(REVIEW_STATE_FILE, state);
            return sendJson(res, 200, { ok: true });
          }

          return next();
        } catch (e) {
          return sendJson(res, 500, { error: (e as Error).message });
        }
      });
    },
  };
}
