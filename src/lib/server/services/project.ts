import { db } from '$lib/server/db';
import { projects, clients } from '$lib/server/db/schema';
import { likePattern } from '$lib/server/db/like';
import { eq, and, ilike, or, asc, desc, count, inArray, sql, type SQL } from 'drizzle-orm';
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
	const setFields: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
	if (data.title !== undefined) setFields.title = data.title;
	if (data.totalAmount !== undefined) setFields.totalAmount = toCents(data.totalAmount);
	if (data.invoiceStatus !== undefined) setFields.invoiceStatus = data.invoiceStatus;
	if (data.paymentStatus !== undefined) setFields.paymentStatus = data.paymentStatus;
	if (data.date !== undefined) setFields.date = data.date ? new Date(data.date) : new Date();

	const [updated] = await db
		.update(projects)
		.set(setFields)
		.where(and(eq(projects.id, id), eq(projects.userId, userId)))
		.returning();

	if (!updated) return null;

	// Recompute payment status from the (possibly new) totals.
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

export type ProjectSortField = 'title' | 'client' | 'total' | 'remaining' | 'date';

export type ProjectListFilters = {
	client?: string | null;
	invoice?: string | null;
	payment?: string | null;
	search?: string | null;
	sort?: ProjectSortField;
	dir?: 'asc' | 'desc';
	page?: number;
	limit?: number;
};

export type ProjectListRow = {
	id: string;
	title: string;
	clientId: string;
	totalAmount: number;
	paidAmount: number;
	invoiceStatus: (typeof projects.invoiceStatus.enumValues)[number];
	paymentStatus: (typeof projects.paymentStatus.enumValues)[number];
	date: Date | null;
	clientName: string;
};

// Paged/filtered project list joined to clients for the /projects view. Always
// scoped by projects.userId; client/invoice/payment/search narrow it further.
// `remaining` (total - paid) is a Postgres-side expression so the default
// "owes more" sort can be done in SQL without loading every row.
export async function listProjects(
	userId: string,
	filters: ProjectListFilters = {}
): Promise<{ projects: ProjectListRow[]; total: number }> {
	const limit = Math.max(1, filters.limit ?? 20);
	const page = Math.max(1, filters.page ?? 1);
	const offset = (page - 1) * limit;
	const dir: 'asc' | 'desc' = filters.dir === 'asc' ? 'asc' : 'desc';
	const sort: ProjectSortField = filters.sort ?? 'remaining';

	const invoiceValues = projects.invoiceStatus.enumValues as readonly string[];
	const paymentValues = projects.paymentStatus.enumValues as readonly string[];

	const conditions: SQL[] = [eq(projects.userId, userId)];
	if (filters.client) conditions.push(eq(projects.clientId, filters.client));
	if (filters.invoice && invoiceValues.includes(filters.invoice)) {
		conditions.push(
			eq(
				projects.invoiceStatus,
				filters.invoice as (typeof projects.invoiceStatus.enumValues)[number]
			)
		);
	}
	if (filters.payment && paymentValues.includes(filters.payment)) {
		conditions.push(
			eq(
				projects.paymentStatus,
				filters.payment as (typeof projects.paymentStatus.enumValues)[number]
			)
		);
	}
	if (filters.search) {
		const pattern = likePattern(filters.search);
		conditions.push(or(ilike(projects.title, pattern), ilike(clients.name, pattern)) as SQL);
	}
	const where = and(...conditions);

	const remainingExpr = sql<number>`(${projects.totalAmount} - ${projects.paidAmount})`;
	const sortExpr =
		sort === 'title'
			? projects.title
			: sort === 'client'
				? clients.name
				: sort === 'total'
					? projects.totalAmount
					: sort === 'date'
						? projects.date
						: remainingExpr;

	const [countRow] = await db
		.select({ total: count() })
		.from(projects)
		.innerJoin(clients, eq(projects.clientId, clients.id))
		.where(where);
	const total = Number(countRow?.total ?? 0);

	const rows = await db
		.select({
			id: projects.id,
			title: projects.title,
			clientId: projects.clientId,
			totalAmount: projects.totalAmount,
			paidAmount: projects.paidAmount,
			invoiceStatus: projects.invoiceStatus,
			paymentStatus: projects.paymentStatus,
			date: projects.date,
			clientName: clients.name
		})
		.from(projects)
		.innerJoin(clients, eq(projects.clientId, clients.id))
		.where(where)
		.orderBy(dir === 'asc' ? asc(sortExpr) : desc(sortExpr), asc(projects.createdAt))
		.limit(limit)
		.offset(offset);

	return { projects: rows as ProjectListRow[], total };
}

// Bulk delete scoped to the caller's tenant. Mirrors deleteClients: inArray +
// userId filter so a forged id list cannot reach another tenant's rows.
export async function deleteProjects(userId: string, ids: string[]) {
	const uniqueIds = [...new Set(ids.filter(Boolean))];
	if (uniqueIds.length === 0) return [];

	const deleted = await db
		.delete(projects)
		.where(and(inArray(projects.id, uniqueIds), eq(projects.userId, userId)))
		.returning({ id: projects.id });
	return deleted.map((r) => r.id);
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
