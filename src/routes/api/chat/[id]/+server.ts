import { json } from '@sveltejs/kit';
import {
	getConversationById,
	getMessages,
	updateConversation,
	deleteConversation
} from '$lib/server/services';
import { updateConversationSchema } from '$lib/validations';
import { unauthorized, notFound, handleZodError, handleApiError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return unauthorized();

	// Verify the conversation belongs to the caller before returning messages.
	const conversation = await getConversationById(locals.user.id, params.id);
	if (!conversation) return notFound('Conversation');

	const messages = await getMessages(locals.user.id, params.id);
	return json(messages);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return unauthorized();

	const conversation = await getConversationById(locals.user.id, params.id);
	if (!conversation) return notFound('Conversation');

	await deleteConversation(locals.user.id, params.id);
	return json({ success: true });
};

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();
	const parsed = updateConversationSchema.safeParse(body);

	if (!parsed.success) {
		return handleZodError(parsed.error);
	}

	try {
		const updated = await updateConversation(locals.user.id, params.id, parsed.data.title);
		if (!updated) return notFound('Conversation');

		return json(updated);
	} catch (error) {
		return handleApiError(error);
	}
};
