import { json } from '@sveltejs/kit';
import { addMessage } from '$lib/server/services';
import { unauthorized, badRequest } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();

	if (!body.role || !body.content) {
		return badRequest('role and content are required');
	}

	const message = await addMessage(locals.user.id, params.id, {
		role: body.role,
		content: body.content
	});

	return json(message, { status: 201 });
};
