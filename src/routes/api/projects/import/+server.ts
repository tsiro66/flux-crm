import { json } from '@sveltejs/kit';
import { parseCsv } from '$lib/server/csv';
import { listAllClients, upsertProjectFromImport } from '$lib/server/services';
import { rateLimit } from '$lib/server/ratelimit';
import { importProjectRowSchema } from '$lib/validations';
import { unauthorized, handleApiError, badRequest, tooManyRequests } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return unauthorized();

	if (!rateLimit(locals.user.id, { max: 1, windowMs: 10_000 })) {
		return tooManyRequests('Please wait before importing again');
	}

	try {
		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File)) return badRequest('No file uploaded');
		if (!file.name.toLowerCase().endsWith('.csv')) return badRequest('File must be a CSV');

		const buffer = Buffer.from(await file.arrayBuffer());
		const { rows, errors: parseErrors } = parseCsv(buffer);

		const allClients = await listAllClients(locals.user.id);
		const byEmail = new Map<string, string>();
		const byName = new Map<string, string>();
		for (const c of allClients) {
			if (c.email) byEmail.set(c.email.toLowerCase(), c.id);
			byName.set(c.name.toLowerCase(), c.id);
		}

		let created = 0;
		let updated = 0;
		let skipped = 0;
		const errors: { row: number; message: string }[] = parseErrors.map((m) => ({
			row: 0,
			message: m
		}));

		for (let i = 0; i < rows.length; i++) {
			const rowNumber = i + 2;
			const parsed = importProjectRowSchema.safeParse(rows[i]);
			if (!parsed.success) {
				skipped++;
				errors.push({
					row: rowNumber,
					message: parsed.error.issues.map((e) => e.message).join(', ')
				});
				continue;
			}

			const clientId =
				parsed.data.clientEmail.trim() && byEmail.get(parsed.data.clientEmail.trim().toLowerCase())
					? byEmail.get(parsed.data.clientEmail.trim().toLowerCase())!
					: (byName.get(parsed.data.clientName.trim().toLowerCase()) ?? null);

			if (!clientId) {
				skipped++;
				errors.push({
					row: rowNumber,
					message: `No client found for "${parsed.data.clientEmail || parsed.data.clientName}"`
				});
				continue;
			}

			try {
				const result = await upsertProjectFromImport(locals.user.id, clientId, parsed.data);
				if (result.action === 'created') created++;
				else updated++;
			} catch {
				skipped++;
				errors.push({ row: rowNumber, message: 'Failed to import row' });
			}
		}

		return json({ created, updated, skipped, errors });
	} catch (error) {
		return handleApiError(error);
	}
};
