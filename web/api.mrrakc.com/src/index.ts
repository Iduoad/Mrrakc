import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Airtable from 'airtable';

type Bindings = {
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
  AIRTABLE_TABLE_NAME: string;
  TURNSTILE_SECRET_KEY: string;
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
  allowHeaders: ['Content-Type', 'X-Turnstile-Token'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
}));

app.get('/', (c) => {
  const version = c.env.GIT_COMMIT || (c.env as any).CF_PAGES_COMMIT_SHA || 'development';
  return c.text(`Mrrakc API is online. Version: ${version}`);
});

app.post('/places', async (c) => {
  const turnstileToken = c.req.header('X-Turnstile-Token');
  const remoteIp = c.req.header('CF-Connecting-IP');

  // 1. Bot Verification check
  if (!turnstileToken) {
    return c.json({ error: 'Unauthorized: Missing security token' }, 401);
  }

  const formData = new FormData();
  // Use provided secret or the "Always Pass" test secret
  const secretKey = c.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
  formData.append('secret', secretKey);
  formData.append('response', turnstileToken);
  if (remoteIp) formData.append('remoteip', remoteIp);

  const verificationResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });

  const verificationResult: any = await verificationResponse.json();
  if (!verificationResult.success) {
    return c.json({ error: 'Unauthorized: Bot verification failed', details: verificationResult['error-codes'] }, 403);
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
          "status": "Pending"
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
