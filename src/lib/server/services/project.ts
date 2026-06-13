import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { toCents } from '$lib/utils/formatters';
import type { z } from 'zod';
import type { createProjectSchema, updateProjectSchema } from '$lib/validations';

type CreateProjectInput = z.infer<typeof createProjectSchema> & { clientId: string };
type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export function derivePaymentStatus(paidAmount: number, totalAmount: number) {
	if (paidAmount >= totalAmount) return 'paid' as const;
	if (paidAmount > 0) return 'partial_payment' as const;
	return 'not_paid' as const;
}

export async function createProject(userId: string, data: CreateProjectInput) {
	const totalAmountCents = toCents(data.totalAmount);

	const [project] = await db
		.insert(projects)
		.values({
			title: data.title,
			clientId: data.clientId,
			totalAmount: totalAmountCents,
			invoiceStatus: data.invoiceStatus,
			paymentStatus: data.paymentStatus,
			date: data.date ? new Date(data.date) : new Date(),
			userId
		})
		.returning();
	return project;
}

export async function updateProject(userId: string, id: string, data: UpdateProjectInput) {
	const totalAmountCents = toCents(data.totalAmount);

	const [updated] = await db
		.update(projects)
		.set({
			title: data.title,
			totalAmount: totalAmountCents,
			invoiceStatus: data.invoiceStatus,
			paymentStatus: data.paymentStatus,
			date: data.date ? new Date(data.date) : new Date(),
			updatedAt: new Date()
		})
		.where(and(eq(projects.id, id), eq(projects.userId, userId)))
		.returning();
	return updated ?? null;
}

export async function updateProjectStatus(
	userId: string,
	id: string,
	data: { invoiceStatus?: string; paymentStatus?: string }
) {
	const updateData: Record<string, string | Date> = { updatedAt: new Date() };
	if (data.invoiceStatus) updateData.invoiceStatus = data.invoiceStatus;
	if (data.paymentStatus) updateData.paymentStatus = data.paymentStatus;

	const [updated] = await db
		.update(projects)
		.set(updateData)
		.where(and(eq(projects.id, id), eq(projects.userId, userId)))
		.returning();
	return updated ?? null;
}

export async function deleteProject(userId: string, id: string) {
	const [deleted] = await db
		.delete(projects)
		.where(and(eq(projects.id, id), eq(projects.userId, userId)))
		.returning();
	return deleted ?? null;
}

export async function updateProjectPaymentStatus(projectId: string) {
	const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
	if (!project) return;

	const paymentStatus = derivePaymentStatus(project.paidAmount, project.totalAmount);

	await db
		.update(projects)
		.set({ paymentStatus, updatedAt: new Date() })
		.where(eq(projects.id, projectId));
}
