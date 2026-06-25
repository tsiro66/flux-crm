import { json } from '@sveltejs/kit';
import { generateUploadUrl, verifyClientOwnership } from '$lib/server/services';
import { unauthorized, badRequest, notFound, handleApiError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

const ALLOWED_MIME_TYPES = new Set([
	'image/png',
	'image/jpeg',
	'image/gif',
	'image/webp',
	'application/pdf'
]);

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return unauthorized();

	const { filename, contentType, clientId } = await request.json();

	if (!filename || !clientId) {
		return badRequest('Missing required fields');
	}

	if (!contentType || !ALLOWED_MIME_TYPES.has(contentType)) {
		return badRequest('Invalid file type. Allowed: PNG, JPEG, GIF, WebP, PDF.');
	}

	const owns = await verifyClientOwnership(locals.user.id, clientId);
	if (!owns) return notFound('Client');

	try {
		const result = await generateUploadUrl(locals.user.id, clientId, filename);
		return json(result);
	} catch (error) {
		return handleApiError(error);
	}
};
