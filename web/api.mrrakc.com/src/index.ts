import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Airtable from 'airtable';

type Bindings = {
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
  AIRTABLE_TABLE_NAME: string;
  ACCESS_CODE: string;
  GIT_COMMIT?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for frontend domains
app.use('*', cors({
  origin: (origin) => {
    const allowedOrigins = ['http://localhost:5173', 'https://build.mrrakc.com'];
    if (allowedOrigins.includes(origin)) {
      return origin;
    }
    return allowedOrigins[1]; // Default to production
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
}));

app.get('/', (c) => {
  const version = c.env.GIT_COMMIT || (c.env as any).CF_PAGES_COMMIT_SHA || 'development';
  return c.text(`Mrrakc API is online. Version: ${version}`);
});

app.post('/places', async (c) => {
  const authHeader = c.req.header('Authorization');
  const accessCode = c.env.ACCESS_CODE;

  // 1. Authorization check
  if (!authHeader || authHeader !== accessCode) {
    return c.json({ error: 'Unauthorized: Invalid access code' }, 401);
  }

  try {
    const placeData = await c.req.json();
    const placeId = placeData.spec?.id;

    if (!placeId) {
      return c.json({ error: 'Invalid data: place id is required' }, 400);
    }

    const base = new Airtable({ apiKey: c.env.AIRTABLE_API_KEY }).base(c.env.AIRTABLE_BASE_ID);
    const table = base(c.env.AIRTABLE_TABLE_NAME || 'Places');

    // 2. Duplicate Check
    const existingRecords = await table
      .select({
        filterByFormula: `{id} = '${placeId}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (existingRecords.length > 0) {
      return c.json({ error: 'Conflict: This place already exists in Airtable' }, 409);
    }

    // 3. Insert Record
    // We map the nested JSON to a flat structure for Airtable or store it as a string
    // Here we'll store the core fields and the full JSON string for safety.
    await table.create([
      {
        fields: {
          "id": placeId,
          "province": placeData.spec?.location?.province,
          "data": JSON.stringify(placeData, null, 2),
          "status": "pending"
        }
      }
    ]);

    return c.json({ success: true, message: `Place '${placeId}' added to Airtable.` });

  } catch (error: any) {
    console.error('Submission failed:', error);
    return c.json({ error: 'Internal Server Error', details: error.message }, 500);
  }
});

export default app;
