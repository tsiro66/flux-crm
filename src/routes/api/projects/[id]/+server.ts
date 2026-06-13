import { json } from '@sveltejs/kit';
import { updateProject, deleteProject } from '$lib/server/services';
import { updateProjectSchema } from '$lib/validations';
import { unauthorized, notFound, handleZodError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();
	const parsed = updateProjectSchema.safeParse(body);

	if (!parsed.success) {
		return handleZodError(parsed.error);
	}

	const updated = await updateProject(locals.user.id, params.id, parsed.data);
	if (!updated) return notFound('Project');

	return json(updated);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return unauthorized();

	const deleted = await deleteProject(locals.user.id, params.id);
	if (!deleted) return notFound('Project');

	return json({ success: true });
};
