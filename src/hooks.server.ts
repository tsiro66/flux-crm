import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const supabaseUrl = process.env.SUPABASE_URL;
	const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
	}

	event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };

		const {
			data: { user }
		} = await event.locals.supabase.auth.getUser();
		if (!user) return { session: null, user: null };

		return { session, user };
	};

	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	if (!session && event.url.pathname !== '/login') {
		throw redirect(303, '/login');
	}

	if (session && event.url.pathname === '/login') {
		throw redirect(303, '/dashboard');
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range';
		}
	});
};
