import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { files } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const [file] = await db
		.select()
		.from(files)
		.where(and(eq(files.id, params.id), eq(files.userId, locals.user.id)));

	if (!file) return json({ error: 'Not found' }, { status: 404 });

	const supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);

	await supabase.storage.from('client-files').remove([file.storagePath]);

	await db.delete(files).where(eq(files.id, params.id));

	return json({ success: true });
};