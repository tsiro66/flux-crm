import { flue } from '@flue/runtime/routing';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient } from '@supabase/supabase-js';

const app = new Hono();

// CORS — in production, ALLOWED_ORIGIN must point at the web app origin
// (e.g. https://flux-web.fly.dev). Empty/unset falls back to '*' which is only
// safe for local development.
app.use('*', cors({ origin: process.env.ALLOWED_ORIGIN ?? '*' }));

// Supabase client used only to verify caller JWTs server-side. The anon key is
// safe here: auth.getUser() validates the JWT signature against Supabase's
// JWKS, it does not grant data access on its own.
const supabase = createClient(process.env.SUPABASE_URL ?? '', process.env.SUPABASE_ANON_KEY ?? '', {
	auth: { persistSession: false, autoRefreshToken: false }
});

// Authentication + tenant guard for every agent invocation.
//
// Flue routes agents at /agents/:name/:id, where :id is the agent instance id.
// The crm-assistant agent uses that :id directly as the tenant userId for its
// tool queries. Without this middleware, an unauthenticated caller could pass
// any UUID as :id and read/mutate another tenant's data. We verify the Supabase
// access token carried as `Authorization: Bearer <jwt>` and assert that the
// verified user id matches the requested :id.
app.use('/agents/*', async (c, next) => {
	const authHeader = c.req.header('authorization') ?? c.req.header('Authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
	if (!token) return c.json({ error: 'Unauthorized' }, 401);

	const {
		data: { user },
		error
	} = await supabase.auth.getUser(token);
	if (error || !user) return c.json({ error: 'Unauthorized' }, 401);

	// The requested tenant id is the last path segment: /agents/:name/:id
	const pathParts = c.req.path.split('/').filter(Boolean);
	const requestedId = pathParts[pathParts.length - 1];
	// name is pathParts[pathParts.length - 2], id is last. WebSocket upgrade
	// requests may carry query strings; strip them defensively.
	const requestedTenantId = requestedId?.split('?')[0];

	if (!requestedTenantId || requestedTenantId !== user.id) {
		return c.json({ error: 'Forbidden: tenant mismatch' }, 403);
	}

	// Make the verified user id available to downstream handlers if needed.
	c.set('userId', user.id);
	await next();
});

app.route('/', flue());

export default app;
