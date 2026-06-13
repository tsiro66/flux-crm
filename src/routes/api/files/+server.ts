import { json } from '@sveltejs/kit';
import { createFile } from '$lib/server/services';
import { unauthorized, badRequest } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return unauthorized();

	const { clientId, storagePath, filename, fileType } = await request.json();

	if (!clientId || !storagePath || !filename || !fileType) {
		return badRequest('Missing required fields');
	}

	const file = await createFile(locals.user.id, { clientId, storagePath, filename, fileType });
	return json(file, { status: 201 });
};
