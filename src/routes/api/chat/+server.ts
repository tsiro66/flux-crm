import { json } from '@sveltejs/kit';
import { listConversations, createConversation } from '$lib/server/services';
import { createConversationSchema } from '$lib/validations';
import { unauthorized, handleZodError, handleApiError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return unauthorized();

	const conversations = await listConversations(locals.user.id);
	return json(conversations);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();
	const parsed = createConversationSchema.safeParse({ title: body?.title ?? 'New Chat' });

	if (!parsed.success) {
		return handleZodError(parsed.error);
	}

	try {
		const conversation = await createConversation(locals.user.id, parsed.data.title);
		return json(conversation, { status: 201 });
	} catch (error) {
		return handleApiError(error);
	}
};
