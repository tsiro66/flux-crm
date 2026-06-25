import { db } from '$lib/server/db';
import { projects, clients } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { toCents } from '$lib/utils/formatters';
import { verifyClientOwnership } from './client';
import { ApiError } from '$lib/server/errors';
import type { z } from 'zod/v4';
import type {
	createProjectSchema,
	updateProjectSchema,
	updateProjectStatusSchema,
	ImportProjectRowInput
} from '$lib/validations';

type CreateProjectInput = z.infer<typeof createProjectSchema>;
type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
type UpdateProjectStatusInput = z.infer<typeof updateProjectStatusSchema>;

export function derivePaymentStatus(paidAmount: number, totalAmount: number) {
	if (paidAmount >= totalAmount) return 'paid' as const;
	if (paidAmount > 0) return 'partial_payment' as const;
	return 'not_paid' as const;
}

export async function createProject(userId: string, data: CreateProjectInput) {
	const owns = await verifyClientOwnership(userId, data.clientId);
	if (!owns) throw new ApiError(404, 'Client not found');

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
			date: data.date ? new Date(data.date) : new Date(),
			updatedAt: new Date()
		})
		.where(and(eq(projects.id, id), eq(projects.userId, userId)))
		.returning();

	if (!updated) return null;

	const paymentStatus = derivePaymentStatus(updated.paidAmount, updated.totalAmount);
	if (paymentStatus !== updated.paymentStatus) {
		await db
			.update(projects)
			.set({ paymentStatus, updatedAt: new Date() })
			.where(and(eq(projects.id, id), eq(projects.userId, userId)));
		updated.paymentStatus = paymentStatus;
	}

	return updated;
}

export async function updateProjectStatus(
	userId: string,
	id: string,
	data: UpdateProjectStatusInput
) {
	const updateData: Partial<
		Pick<typeof projects.$inferInsert, 'invoiceStatus' | 'paymentStatus'>
	> & { updatedAt: Date } = {
		updatedAt: new Date()
	};
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

export async function updateProjectPaymentStatus(userId: string, projectId: string) {
	const [project] = await db
		.select()
		.from(projects)
		.where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
	if (!project) return;

	const paymentStatus = derivePaymentStatus(project.paidAmount, project.totalAmount);

	await db
		.update(projects)
		.set({ paymentStatus, updatedAt: new Date() })
		.where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
}

export async function listAllProjectsWithClient(userId: string) {
	return db
		.select({
			id: projects.id,
			title: projects.title,
			totalAmount: projects.totalAmount,
			paidAmount: projects.paidAmount,
			invoiceStatus: projects.invoiceStatus,
			paymentStatus: projects.paymentStatus,
			date: projects.date,
			clientName: clients.name,
			clientEmail: clients.email
		})
		.from(projects)
		.innerJoin(clients, eq(projects.clientId, clients.id))
		.where(eq(projects.userId, userId))
		.orderBy(projects.createdAt);
}

export async function findProjectByClientAndTitle(userId: string, clientId: string, title: string) {
	const [project] = await db
		.select()
		.from(projects)
		.where(
			and(eq(projects.userId, userId), eq(projects.clientId, clientId), eq(projects.title, title))
		)
		.limit(1);
	return project ?? null;
}

export async function upsertProjectFromImport(
	userId: string,
	clientId: string,
	data: ImportProjectRowInput
): Promise<{ action: 'created' | 'updated'; project: typeof projects.$inferSelect }> {
	const totalAmountCents = toCents(data.totalAmount);
	const paidAmountCents = toCents(data.paidAmount);
	const paymentStatus = derivePaymentStatus(paidAmountCents, totalAmountCents);
	const date = data.date ? new Date(data.date) : new Date();

	const existing = await findProjectByClientAndTitle(userId, clientId, data.title);
	if (existing) {
		const [updated] = await db
			.update(projects)
			.set({
				title: data.title,
				totalAmount: totalAmountCents,
				paidAmount: paidAmountCents,
				invoiceStatus: data.invoiceStatus,
				paymentStatus,
				date,
				updatedAt: new Date()
			})
			.where(and(eq(projects.id, existing.id), eq(projects.userId, userId)))
			.returning();
		return { action: 'updated', project: updated ?? existing };
	}

	const [created] = await db
		.insert(projects)
		.values({
			title: data.title,
			clientId,
			totalAmount: totalAmountCents,
			paidAmount: paidAmountCents,
			invoiceStatus: data.invoiceStatus,
			paymentStatus,
			date,
			userId
		})
		.returning();
	return { action: 'created', project: created };
}
