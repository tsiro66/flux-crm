import { json } from '@sveltejs/kit';
import { generateUploadUrl, verifyClientOwnership } from '$lib/server/services';
import { rateLimit } from '$lib/server/ratelimit';
import {
	unauthorized,
	badRequest,
	notFound,
	tooManyRequests,
	handleApiError
} from '$lib/server/errors';
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

	// Signed URLs are cheap to mint but each one enables a storage write;
	// throttle so a script can't flood the bucket with orphan objects.
	if (!rateLimit(locals.user.id, { max: 20, windowMs: 60_000 })) {
		return tooManyRequests('Too many upload requests, please slow down');
	}

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
