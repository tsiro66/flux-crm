import { json } from '@sveltejs/kit';
import { createPayment } from '$lib/server/services';
import { createPaymentSchema } from '$lib/validations';
import { unauthorized, notFound, handleZodError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return unauthorized();

	const body = await request.json();
	const parsed = createPaymentSchema.safeParse(body);

	if (!parsed.success) {
		return handleZodError(parsed.error);
	}

	const payment = await createPayment(locals.user.id, parsed.data);
	if (!payment) return notFound('Project');

	return json(payment, { status: 201 });
};
