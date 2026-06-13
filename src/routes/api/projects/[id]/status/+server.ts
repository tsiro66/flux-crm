import { json } from '@sveltejs/kit';
import { updateProjectStatus } from '$lib/server/services';
import { unauthorized, notFound, badRequest } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();

	if (!body.invoiceStatus && !body.paymentStatus) {
		return badRequest('No status provided');
	}

	const updated = await updateProjectStatus(locals.user.id, params.id, body);
	if (!updated) return notFound('Project');

	return json(updated);
};
