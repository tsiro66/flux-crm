import { json } from '@sveltejs/kit';
import { listRecurringPayments, createRecurringPayment } from '$lib/server/services';
import { createRecurringPaymentSchema } from '$lib/validations';
import { unauthorized, badRequest, handleZodError, handleApiError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return unauthorized();

	const clientId = url.searchParams.get('clientId');
	if (!clientId) return badRequest('clientId query param is required');

	const recurring = await listRecurringPayments(locals.user.id, clientId);
	return json(recurring);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();
	const parsed = createRecurringPaymentSchema.safeParse(body);

	if (!parsed.success) {
		return handleZodError(parsed.error);
	}

	try {
		const recurring = await createRecurringPayment(locals.user.id, parsed.data);
		return json(recurring, { status: 201 });
	} catch (error) {
		return handleApiError(error);
	}
};
