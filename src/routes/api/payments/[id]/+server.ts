import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { payments, projects } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const [payment] = await db
		.select()
		.from(payments)
		.where(and(eq(payments.id, params.id), eq(payments.userId, locals.user.id)));

	if (!payment) return json({ error: 'Not found' }, { status: 404 });

	await db.delete(payments).where(eq(payments.id, params.id));

	const [project] = await db
		.select()
		.from(projects)
		.where(eq(projects.id, payment.projectId));

	if (project) {
		const newPaidAmount = Math.max(0, project.paidAmount - payment.amount);
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
			.where(eq(projects.id, payment.projectId));
	}

	return json({ success: true });
};