import { db } from '$lib/server/db';
import { payments, projects } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { toCents } from '$lib/utils/formatters';
import { derivePaymentStatus } from './project';
import type { z } from 'zod';
import type { createPaymentSchema } from '$lib/validations';

type CreatePaymentInput = z.infer<typeof createPaymentSchema> & { projectId: string };

export async function createPayment(userId: string, data: CreatePaymentInput) {
	const amountCents = toCents(data.amount);

	const [project] = await db
		.select()
		.from(projects)
		.where(and(eq(projects.id, data.projectId), eq(projects.userId, userId)));

	if (!project) return null;

	const [payment] = await db
		.insert(payments)
		.values({
			projectId: data.projectId,
			amount: amountCents,
			date: new Date(data.date),
			note: data.note || null,
			userId
		})
		.returning();

	const newPaidAmount = project.paidAmount + amountCents;
	const newPaymentStatus = derivePaymentStatus(newPaidAmount, project.totalAmount);

	await db
		.update(projects)
		.set({
			paidAmount: newPaidAmount,
			paymentStatus: newPaymentStatus,
			updatedAt: new Date()
		})
		.where(eq(projects.id, data.projectId));

	return payment;
}

export async function deletePayment(userId: string, id: string) {
	const [payment] = await db
		.select()
		.from(payments)
		.where(and(eq(payments.id, id), eq(payments.userId, userId)));

	if (!payment) return null;

	await db.delete(payments).where(eq(payments.id, id));

	const [project] = await db.select().from(projects).where(eq(projects.id, payment.projectId));

	if (project) {
		const newPaidAmount = Math.max(0, project.paidAmount - payment.amount);
		const newPaymentStatus = derivePaymentStatus(newPaidAmount, project.totalAmount);

		await db
			.update(projects)
			.set({
				paidAmount: newPaidAmount,
				paymentStatus: newPaymentStatus,
				updatedAt: new Date()
			})
			.where(eq(projects.id, payment.projectId));
	}

	return payment;
}
