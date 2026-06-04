import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { filename, contentType, clientId } = await request.json();

	if (!filename || !contentType || !clientId) {
		return json({ error: 'Missing required fields' }, { status: 400 });
	}

	const supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);

	const storagePath = `${locals.user.id}/${clientId}/${Date.now()}-${filename}`;

	const { data, error } = await supabase.storage
		.from('client-files')
		.createSignedUploadUrl(storagePath);

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ signedUrl: data.signedUrl, storagePath, token: data.token });
};