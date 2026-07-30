import { json } from '@sveltejs/kit';
import { updateRecurringPayment, deleteRecurringPayment } from '$lib/server/services';
import { updateRecurringPaymentSchema } from '$lib/validations';
import { unauthorized, notFound, handleZodError, handleApiError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();
	const parsed = updateRecurringPaymentSchema.safeParse(body);

	if (!parsed.success) {
		return handleZodError(parsed.error);
	}

	try {
		const updated = await updateRecurringPayment(locals.user.id, params.id, parsed.data);
		if (!updated) return notFound('Recurring payment');
		return json(updated);
	} catch (error) {
		return handleApiError(error);
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return unauthorized();

	const deleted = await deleteRecurringPayment(locals.user.id, params.id);
	if (!deleted) return notFound('Recurring payment');

	return json({ success: true });
};
