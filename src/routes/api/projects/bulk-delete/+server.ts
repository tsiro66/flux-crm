import { json } from '@sveltejs/kit';
import { deleteProjects } from '$lib/server/services';
import { bulkDeleteProjectsSchema } from '$lib/validations';
import { rateLimit } from '$lib/server/ratelimit';
import { unauthorized, handleZodError, handleApiError, tooManyRequests } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return unauthorized();

	// Bulk delete is a destructive action; throttle tighter than single deletes
	// to make accidental runaway loops less costly.
	if (!rateLimit(locals.user.id, { max: 5, windowMs: 10_000 })) {
		return tooManyRequests('Too many bulk deletes, please slow down');
	}

	const body = await request.json();
	const parsed = bulkDeleteProjectsSchema.safeParse(body);

	if (!parsed.success) {
		return handleZodError(parsed.error);
	}

	try {
		const deletedIds = await deleteProjects(locals.user.id, parsed.data.ids);
		return json({ deletedIds, count: deletedIds.length });
	} catch (error) {
		return handleApiError(error);
	}
};
