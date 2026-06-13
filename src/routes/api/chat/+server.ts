import { json } from '@sveltejs/kit';
import { listConversations, createConversation } from '$lib/server/services';
import { unauthorized } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return unauthorized();

	const conversations = await listConversations(locals.user.id);
	return json(conversations);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();
	const title = body.title || 'New Chat';

	const conversation = await createConversation(locals.user.id, title);
	return json(conversation, { status: 201 });
};
