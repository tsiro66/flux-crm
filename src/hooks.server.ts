import { createServerClient } from '@supabase/ssr';
import { redirect, error, json } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// Fail fast at boot instead of crashing mid-request on a misconfigured deploy.
const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	throw new Error('Missing required env vars: SUPABASE_URL and/or SUPABASE_ANON_KEY');
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isAllowedOrigin(origin: string | null, host: string | null): boolean {
	if (!origin || !host) return false;
	let originHost: string;
	try {
		originHost = new URL(origin).host;
	} catch {
		return false;
	}
	if (originHost === host) return true;
	const allowed = env.CSRF_ALLOWED_ORIGINS;
	if (allowed) {
		const allowedSet = new Set(allowed.split(',').map((s) => s.trim()));
		if (allowedSet.has(origin)) return true;
	}
	return false;
}

export const handle: Handle = async ({ event, resolve }) => {
	if (MUTATING_METHODS.has(event.request.method)) {
		const origin = event.request.headers.get('origin');
		const host = event.request.headers.get('host');
		if (!isAllowedOrigin(origin, host)) {
			throw error(403, 'Forbidden: CSRF check failed');
		}
	}

	event.locals.supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
		cookies: {
			getAll() {
				return event.cookies.getAll();
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) =>
					event.cookies.set(name, value, { ...options, path: '/' })
				);
			}
		}
	});

	event.locals.safeGetSession = async () => {
		const {
			data: { user }
		} = await event.locals.supabase.auth.getUser();
		if (!user) return { session: null, user: null };

		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		return { session, user };
	};

	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	if (!user && event.url.pathname !== '/login') {
		// API callers get a machine-readable 401, browsers get redirected.
		if (event.url.pathname.startsWith('/api/')) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		throw redirect(303, '/login');
	}

	if (user && event.url.pathname === '/login') {
		throw redirect(303, '/dashboard');
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range';
		}
	});
};
