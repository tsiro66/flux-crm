import { db } from '$lib/server/db';
import { payments, projects } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { toCents } from '$lib/utils/formatters';
import { derivePaymentStatus } from './project';
import type { z } from 'zod/v4';
import type { updatePaymentSchema, CreatePaymentInput } from '$lib/validations';

// The tx handle Drizzle passes into db.transaction callbacks.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Shared by createPayment and recurring-payment generation: inserts nothing,
// only bumps the project's paidAmount and re-derives its payment status.
// Caller supplies the project row (already verified to belong to the user).
export async function applyPaymentToProject(
	tx: Tx,
	project: typeof projects.$inferSelect,
	amountCents: number
) {
	const newPaidAmount = project.paidAmount + amountCents;
	await tx
		.update(projects)
		.set({
			paidAmount: newPaidAmount,
			paymentStatus: derivePaymentStatus(newPaidAmount, project.totalAmount),
			updatedAt: new Date()
		})
		.where(eq(projects.id, project.id));
}

export async function createPayment(userId: string, data: CreatePaymentInput) {
	const amountCents = toCents(data.amount);

	return await db.transaction(async (tx) => {
		const [project] = await tx
			.select()
			.from(projects)
			.where(and(eq(projects.id, data.projectId), eq(projects.userId, userId)));

		if (!project) return null;

		const [payment] = await tx
			.insert(payments)
			.values({
				projectId: data.projectId,
				amount: amountCents,
				date: new Date(data.date),
				note: data.note || null,
				userId
			})
			.returning();

		await applyPaymentToProject(tx, project, amountCents);

		return payment;
	});
}

export async function updatePayment(
	userId: string,
	id: string,
	data: z.infer<typeof updatePaymentSchema>
) {
	return await db.transaction(async (tx) => {
		const [payment] = await tx
			.select()
			.from(payments)
			.where(and(eq(payments.id, id), eq(payments.userId, userId)));

		if (!payment) return null;

		const newAmountCents = toCents(data.amount);
		const amountDiff = newAmountCents - payment.amount;

		const [updated] = await tx
			.update(payments)
			.set({
				amount: newAmountCents,
				date: new Date(data.date),
				note: data.note || null
			})
			.where(eq(payments.id, id))
			.returning();

		const [project] = await tx.select().from(projects).where(eq(projects.id, payment.projectId));

		if (project) {
			const newPaidAmount = project.paidAmount + amountDiff;
			const newPaymentStatus = derivePaymentStatus(newPaidAmount, project.totalAmount);

			await tx
				.update(projects)
				.set({
					paidAmount: newPaidAmount,
					paymentStatus: newPaymentStatus,
					updatedAt: new Date()
				})
				.where(eq(projects.id, payment.projectId));
		}

		return updated;
	});
}

export async function deletePayment(userId: string, id: string) {
	return await db.transaction(async (tx) => {
		const [payment] = await tx
			.select()
			.from(payments)
			.where(and(eq(payments.id, id), eq(payments.userId, userId)));

		if (!payment) return null;

		await tx.delete(payments).where(eq(payments.id, id));

		const [project] = await tx.select().from(projects).where(eq(projects.id, payment.projectId));

		if (project) {
			const newPaidAmount = Math.max(0, project.paidAmount - payment.amount);
			const newPaymentStatus = derivePaymentStatus(newPaidAmount, project.totalAmount);

			await tx
				.update(projects)
				.set({
					paidAmount: newPaidAmount,
					paymentStatus: newPaymentStatus,
					updatedAt: new Date()
				})
				.where(eq(projects.id, payment.projectId));
		}

		return payment;
	});
}
