import { json } from '@sveltejs/kit';
import { createFile, verifyClientOwnership } from '$lib/server/services';
import { createFileSchema } from '$lib/validations';
import { unauthorized, notFound, handleZodError, handleApiError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();
	const parsed = createFileSchema.safeParse(body);

	if (!parsed.success) {
		return handleZodError(parsed.error);
	}

	const owns = await verifyClientOwnership(locals.user.id, parsed.data.clientId);
	if (!owns) return notFound('Client');

	try {
		const file = await createFile(locals.user.id, parsed.data);
		return json(file, { status: 201 });
	} catch (error) {
		return handleApiError(error);
	}
};
