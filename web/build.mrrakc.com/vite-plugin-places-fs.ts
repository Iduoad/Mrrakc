import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Plugin, Connect } from 'vite';

// Repo layout: this app lives at web/build.mrrakc.com, the dataset at data/places.
const DATA_DIR = path.resolve(import.meta.dirname, '../../data/places');

type Req = Connect.IncomingMessage;
type Res = import('node:http').ServerResponse;

function sendJson(res: Res, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(payload);
}

function readBody(req: Req): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Resolve a province/id pair to an absolute file path, guarding against escapes.
function resolvePlaceFile(province: string, id: string): string | null {
  if (!province || !id) return null;
  const slug = /^[a-z0-9-]+$/;
  if (!slug.test(province) || !slug.test(id)) return null;
  const file = path.resolve(DATA_DIR, province, `${id}.json`);
  if (file !== path.join(DATA_DIR, province, `${id}.json`)) return null;
  if (!file.startsWith(DATA_DIR + path.sep)) return null;
  return file;
}

async function listProvinces() {
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
  const provinces: { id: string; count: number }[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const files = await fs.readdir(path.join(DATA_DIR, entry.name));
    const count = files.filter((f) => f.endsWith('.json')).length;
    provinces.push({ id: entry.name, count });
  }
  provinces.sort((a, b) => a.id.localeCompare(b.id));
  return provinces;
}

async function listPlaces(province: string) {
  if (!/^[a-z0-9-]+$/.test(province)) throw new Error('invalid province');
  const provinceDir = path.resolve(DATA_DIR, province);
  if (!provinceDir.startsWith(DATA_DIR + path.sep)) throw new Error('invalid province');
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

/**
 * Dev-only filesystem API for the local place editor. Registered via
 * configureServer so it exists only on `vite dev` and never in a production
 * build. Reads/writes data/places/<province>/<id>.json directly.
 */
export function placesFsPlugin(): Plugin {
  return {
    name: 'places-fs',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        try {
          const url = new URL(req.url || '', 'http://localhost');
          const route = url.pathname; // relative to /api mount, e.g. /provinces

          if (route === '/provinces' && req.method === 'GET') {
            return sendJson(res, 200, await listProvinces());
          }

          if (route === '/places' && req.method === 'GET') {
            const province = url.searchParams.get('province') || '';
            if (!/^[a-z0-9-]+$/.test(province)) {
              return sendJson(res, 400, { error: 'invalid or missing province' });
            }
            return sendJson(res, 200, await listPlaces(province));
          }

          if (route === '/places' && req.method === 'PUT') {
            const body = JSON.parse(await readBody(req));
            const { province, id, place, prev } = body as {
              province: string; id: string; place: unknown;
              prev?: { province: string; id: string };
            };
            const file = resolvePlaceFile(province, id);
            if (!file || !place) {
              return sendJson(res, 400, { error: 'invalid province/id/place' });
            }
            await fs.mkdir(path.dirname(file), { recursive: true });
            await fs.writeFile(file, JSON.stringify(place, null, 2) + '\n', 'utf8');

            // Rename/move: remove the old file if id or province changed.
            if (prev && (prev.province !== province || prev.id !== id)) {
              const oldFile = resolvePlaceFile(prev.province, prev.id);
              if (oldFile && oldFile !== file) {
                await fs.rm(oldFile, { force: true });
              }
            }
            return sendJson(res, 200, { ok: true, file: `${province}/${id}.json` });
          }

          if (route === '/places' && req.method === 'DELETE') {
            const province = url.searchParams.get('province') || '';
            const id = url.searchParams.get('id') || '';
            const file = resolvePlaceFile(province, id);
            if (!file) return sendJson(res, 400, { error: 'invalid province/id' });
            await fs.rm(file, { force: true });
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
