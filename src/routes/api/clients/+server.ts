import { json } from '@sveltejs/kit';
import { listClients, createClient } from '$lib/server/services';
import { createClientSchema } from '$lib/validations';
import { unauthorized, handleZodError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return unauthorized();

	const search = url.searchParams.get('search') || '';
	const result = await listClients(locals.user.id, search || undefined);

	return json(result);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();
	const parsed = createClientSchema.safeParse(body);

	if (!parsed.success) {
		return handleZodError(parsed.error);
	}

	const client = await createClient(locals.user.id, parsed.data);
	return json(client, { status: 201 });
};
