import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { createProjectSchema } from '$lib/validations';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const parsed = createProjectSchema.safeParse(body);

	if (!parsed.success) {
		return json({ error: parsed.error.issues }, { status: 400 });
	}

	const totalAmountCents = Math.round(parseFloat(String(parsed.data.totalAmount)) * 100);

	const [project] = await db
		.insert(projects)
		.values({
			title: parsed.data.title,
			clientId: body.clientId,
			totalAmount: totalAmountCents,
			invoiceStatus: parsed.data.invoiceStatus,
			paymentStatus: parsed.data.paymentStatus,
			date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
			userId: locals.user.id
		})
		.returning();

	return json(project, { status: 201 });
};