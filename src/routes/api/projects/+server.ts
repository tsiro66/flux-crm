import { json } from '@sveltejs/kit';
import { createProject } from '$lib/server/services';
import { createProjectSchema } from '$lib/validations';
import { unauthorized, handleZodError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();
	const parsed = createProjectSchema.safeParse(body);

	if (!parsed.success) {
		return handleZodError(parsed.error);
	}

	const project = await createProject(locals.user.id, { ...parsed.data, clientId: body.clientId });
	return json(project, { status: 201 });
};
