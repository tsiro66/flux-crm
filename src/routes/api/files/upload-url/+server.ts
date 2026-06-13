import { json } from '@sveltejs/kit';
import { generateUploadUrl } from '$lib/server/services';
import { unauthorized, badRequest, handleApiError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return unauthorized();

	const { filename, contentType, clientId } = await request.json();

	if (!filename || !contentType || !clientId) {
		return badRequest('Missing required fields');
	}

	try {
		const result = await generateUploadUrl(locals.user.id, clientId, filename);
		return json(result);
	} catch (error) {
		return handleApiError(error);
	}
};
