import { json } from '@sveltejs/kit';
import { deletePayment, updatePayment } from '$lib/server/services';
import { updatePaymentSchema } from '$lib/validations';
import { unauthorized, notFound, handleZodError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();
	const parsed = updatePaymentSchema.safeParse(body);

	if (!parsed.success) {
		return handleZodError(parsed.error);
	}

	const payment = await updatePayment(locals.user.id, params.id, parsed.data);
	if (!payment) return notFound('Payment');

	return json(payment);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return unauthorized();

	const deleted = await deletePayment(locals.user.id, params.id);
	if (!deleted) return notFound('Payment');

	return json({ success: true });
};
