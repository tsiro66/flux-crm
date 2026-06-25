import { json } from '@sveltejs/kit';
import { updateProjectStatus } from '$lib/server/services';
import { updateProjectStatusSchema } from '$lib/validations';
import { unauthorized, notFound, handleZodError, handleApiError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();
	const parsed = updateProjectStatusSchema.safeParse(body);

	if (!parsed.success) {
		return handleZodError(parsed.error);
	}

	try {
		const updated = await updateProjectStatus(locals.user.id, params.id, parsed.data);
		if (!updated) return notFound('Project');

		return json(updated);
	} catch (error) {
		return handleApiError(error);
	}
};
