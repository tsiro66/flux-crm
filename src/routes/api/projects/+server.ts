import { json } from '@sveltejs/kit';
import { createProject } from '$lib/server/services';
import { createProjectSchema } from '$lib/validations';
import { unauthorized, handleZodError, handleApiError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();
	const parsed = createProjectSchema.safeParse(body);

	if (!parsed.success) {
		return handleZodError(parsed.error);
	}

	try {
		const project = await createProject(locals.user.id, parsed.data);
		return json(project, { status: 201 });
	} catch (error) {
		return handleApiError(error);
	}
};
