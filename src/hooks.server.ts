import { createServerClient } from '@supabase/ssr';
import { redirect, error } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

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

	event.locals.supabase = createServerClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, {
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
