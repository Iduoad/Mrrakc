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
    const body = await c.req.json();
    const places = Array.isArray(body) ? body : [body];

    if (places.length === 0) {
      return c.json({ error: 'No places provided' }, 400);
    }

    const base = new Airtable({ apiKey: c.env.AIRTABLE_API_KEY }).base(c.env.AIRTABLE_BASE_ID);
    const table = base(c.env.AIRTABLE_TABLE_NAME || 'Places');

    // 2. Process in batches (Airtable limit is 10 per create call)
    const results = {
      success: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < places.length; i += 10) {
      const batch = places.slice(i, i + 10);
      
      const recordsToCreate = batch.map((placeData: any) => ({
        fields: {
          "id": placeData.spec?.id,
          "province": placeData.spec?.location?.province,
          "data": JSON.stringify(placeData, null, 2),
          "status": "Pending"
        }
      }));

      try {
        await table.create(recordsToCreate);
        results.success += batch.length;
      } catch (err: any) {
        results.errors.push(`Batch ${i/10 + 1}: ${err.message}`);
      }
    }

    if (results.errors.length > 0 && results.success === 0) {
      return c.json({ error: 'All batch submissions failed', details: results.errors }, 500);
    }

    return c.json({ 
      success: true, 
      message: `Successfully processed ${results.success} places.`,
      errors: results.errors.length > 0 ? results.errors : undefined
    });

  } catch (error: any) {
    console.error('Submission failed:', error);
    return c.json({ error: 'Internal Server Error', details: error.message }, 500);
  }
});

export default app;
