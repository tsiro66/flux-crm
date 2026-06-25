import { json } from '@sveltejs/kit';
import { getClientById, updateClient, patchClient, deleteClient } from '$lib/server/services';
import { updateClientSchema, patchClientSchema } from '$lib/validations';
import { unauthorized, notFound, handleZodError, handleApiError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return unauthorized();

	try {
		const client = await getClientById(locals.user.id, params.id);
		if (!client) return notFound('Client');

		return json(client);
	} catch (error) {
		return handleApiError(error);
	}
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();
	const parsed = updateClientSchema.safeParse(body);

	if (!parsed.success) {
		return handleZodError(parsed.error);
	}

	try {
		const updated = await updateClient(locals.user.id, params.id, parsed.data);
		if (!updated) return notFound('Client');

		return json(updated);
	} catch (error) {
		return handleApiError(error);
	}
};

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();
	const parsed = patchClientSchema.safeParse(body);

	if (!parsed.success) {
		return handleZodError(parsed.error);
	}

	try {
		const updated = await patchClient(locals.user.id, params.id, parsed.data);
		if (!updated) return notFound('Client');

		return json(updated);
	} catch (error) {
		return handleApiError(error);
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return unauthorized();

	try {
		const deleted = await deleteClient(locals.user.id, params.id);
		if (!deleted) return notFound('Client');

		return json({ success: true });
	} catch (error) {
		return handleApiError(error);
	}
};
