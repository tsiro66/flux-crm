import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { updateProjectSchema } from '$lib/validations';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const parsed = updateProjectSchema.safeParse(body);

	if (!parsed.success) {
		return json({ error: parsed.error.issues }, { status: 400 });
	}

	const totalAmountCents = Math.round(parseFloat(String(parsed.data.totalAmount)) * 100);

	const [updated] = await db
		.update(projects)
		.set({
			title: parsed.data.title,
			totalAmount: totalAmountCents,
			invoiceStatus: parsed.data.invoiceStatus,
			paymentStatus: parsed.data.paymentStatus,
			date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
			updatedAt: new Date()
		})
		.where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
		.returning();

	if (!updated) return json({ error: 'Not found' }, { status: 404 });

	return json(updated);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const [deleted] = await db
		.delete(projects)
		.where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
		.returning();

	if (!deleted) return json({ error: 'Not found' }, { status: 404 });

	return json({ success: true });
};