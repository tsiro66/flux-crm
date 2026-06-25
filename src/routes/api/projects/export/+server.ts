import { listAllProjectsWithClient } from '$lib/server/services';
import { toCsv, csvResponse } from '$lib/server/csv';
import { toDollars } from '$lib/utils/formatters';
import { unauthorized, handleApiError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

function toDateOnly(d: Date | string | null): string {
	if (!d) return '';
	const date = typeof d === 'string' ? new Date(d) : d;
	return date.toISOString().split('T')[0];
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return unauthorized();

	try {
		const all = await listAllProjectsWithClient(locals.user.id);
		const rows = all.map((p) => ({
			clientEmail: p.clientEmail || '',
			clientName: p.clientName,
			title: p.title,
			totalAmount: toDollars(p.totalAmount),
			paidAmount: toDollars(p.paidAmount),
			invoiceStatus: p.invoiceStatus,
			paymentStatus: p.paymentStatus,
			date: toDateOnly(p.date)
		}));
		return csvResponse('projects.csv', toCsv(rows));
	} catch (error) {
		return handleApiError(error);
	}
};
