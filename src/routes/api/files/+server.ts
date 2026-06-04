import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { files } from '$lib/server/db/schema';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { clientId, storagePath, filename, fileType } = await request.json();

	if (!clientId || !storagePath || !filename || !fileType) {
		return json({ error: 'Missing required fields' }, { status: 400 });
	}

	const [file] = await db
		.insert(files)
		.values({
			clientId,
			storagePath,
			filename,
			fileType,
			userId: locals.user.id
		})
		.returning();

	return json(file, { status: 201 });
};