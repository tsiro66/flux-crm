// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Locals {
			supabase: import('@supabase/supabase-js').SupabaseClient;
			safeGetSession: () => Promise<{
				session: import('@supabase/supabase-js').Session | null;
				user: import('@supabase/supabase-js').User | null;
			}>;
			session: import('@supabase/supabase-js').Session | null;
			user: import('@supabase/supabase-js').User | null;
		}
		interface PageData {
			session: import('@supabase/supabase-js').Session | null;
			user: import('@supabase/supabase-js').User | null;
		}
	}
}

export {};
