import { listAllClients } from '$lib/server/services';
import { toCsv, csvResponse } from '$lib/server/csv';
import { unauthorized, handleApiError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return unauthorized();

	try {
		const all = await listAllClients(locals.user.id);
		const rows = all.map((c) => ({
			name: c.name,
			email: c.email || '',
			phone: c.phone || '',
			notes: c.notes || ''
		}));
		return csvResponse('clients.csv', toCsv(rows));
	} catch (error) {
		return handleApiError(error);
	}
};
