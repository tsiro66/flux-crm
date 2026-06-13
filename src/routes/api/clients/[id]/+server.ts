import { json } from '@sveltejs/kit';
import { getClientById, updateClient, deleteClient } from '$lib/server/services';
import { updateClientSchema } from '$lib/validations';
import { unauthorized, notFound, handleZodError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return unauthorized();

	const client = await getClientById(locals.user.id, params.id);
	if (!client) return notFound('Client');

	return json(client);
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();
	const parsed = updateClientSchema.safeParse(body);

	if (!parsed.success) {
		return handleZodError(parsed.error);
	}

	const updated = await updateClient(locals.user.id, params.id, parsed.data);
	if (!updated) return notFound('Client');

	return json(updated);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return unauthorized();

	const deleted = await deleteClient(locals.user.id, params.id);
	if (!deleted) return notFound('Client');

	return json({ success: true });
};
