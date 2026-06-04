import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { payments, projects } from '$lib/server/db/schema';
import { createPaymentSchema } from '$lib/validations';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const parsed = createPaymentSchema.safeParse(body);

	if (!parsed.success) {
		return json({ error: parsed.error.issues }, { status: 400 });
	}

	const amountCents = Math.round(parseFloat(String(parsed.data.amount)) * 100);

	const [project] = await db
		.select()
		.from(projects)
		.where(and(eq(projects.id, body.projectId), eq(projects.userId, locals.user.id)));

	if (!project) return json({ error: 'Project not found' }, { status: 404 });

	const [payment] = await db
		.insert(payments)
		.values({
			projectId: body.projectId,
			amount: amountCents,
			date: new Date(parsed.data.date),
			note: parsed.data.note || null,
			userId: locals.user.id
		})
		.returning();

	const newPaidAmount = project.paidAmount + amountCents;
	const newPaymentStatus =
		newPaidAmount >= project.totalAmount
			? 'paid'
			: newPaidAmount > 0
				? 'partial_payment'
				: 'not_paid';

	await db
		.update(projects)
		.set({
			paidAmount: newPaidAmount,
			paymentStatus: newPaymentStatus,
			updatedAt: new Date()
		})
		.where(eq(projects.id, body.projectId));

	return json(payment, { status: 201 });
};