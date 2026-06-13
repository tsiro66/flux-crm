import { json } from '@sveltejs/kit';
import { getMessages, updateConversation, deleteConversation } from '$lib/server/services';
import { unauthorized, notFound } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return unauthorized();

	const messages = await getMessages(locals.user.id, params.id);
	return json(messages);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return unauthorized();

	await deleteConversation(locals.user.id, params.id);
	return json({ success: true });
};

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();

	const updated = await updateConversation(locals.user.id, params.id, body.title);
	if (!updated) return notFound('Conversation');

	return json(updated);
};
