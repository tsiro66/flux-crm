import { json } from '@sveltejs/kit';
import { parseCsv } from '$lib/server/csv';
import { upsertClientFromImport } from '$lib/server/services';
import { importClientRowSchema } from '$lib/validations';
import { unauthorized, handleApiError, badRequest } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return unauthorized();

	try {
		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File)) return badRequest('No file uploaded');
		if (!file.name.toLowerCase().endsWith('.csv')) return badRequest('File must be a CSV');

		const buffer = Buffer.from(await file.arrayBuffer());
		const { rows, errors: parseErrors } = parseCsv(buffer);

		let created = 0;
		let updated = 0;
		let skipped = 0;
		const errors: { row: number; message: string }[] = parseErrors.map((m) => ({
			row: 0,
			message: m
		}));

		for (let i = 0; i < rows.length; i++) {
			const rowNumber = i + 2;
			const parsed = importClientRowSchema.safeParse(rows[i]);
			if (!parsed.success) {
				skipped++;
				errors.push({
					row: rowNumber,
					message: parsed.error.issues.map((e) => e.message).join(', ')
				});
				continue;
			}

			try {
				const result = await upsertClientFromImport(locals.user.id, parsed.data);
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
