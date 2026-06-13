import { json } from '@sveltejs/kit';
import { deletePayment } from '$lib/server/services';
import { unauthorized, notFound } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return unauthorized();

	const deleted = await deletePayment(locals.user.id, params.id);
	if (!deleted) return notFound('Payment');

	return json({ success: true });
};
