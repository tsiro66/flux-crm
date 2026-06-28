import { json } from '@sveltejs/kit';
import { addMessage, getConversationById } from '$lib/server/services';
import { rateLimit } from '$lib/server/ratelimit';
import { unauthorized, notFound, badRequest, tooManyRequests } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return unauthorized();

	// Verify the conversation belongs to the caller before appending a message.
	const conversation = await getConversationById(locals.user.id, params.id);
	if (!conversation) return notFound('Conversation');

	const body = await request.json();

	if (!body.role || !body.content) {
		return badRequest('role and content are required');
	}

	// The chat itself streams via the Flue agent; this endpoint only persists
	// messages, so a per-user throttle here just blocks flood attempts.
	if (!rateLimit(locals.user.id, { max: 30, windowMs: 60_000 })) {
		return tooManyRequests('Too many messages, please slow down');
	}

	const message = await addMessage(locals.user.id, params.id, {
		role: body.role,
		content: body.content
	});

	return json(message, { status: 201 });
};
