import { db } from '$lib/server/db';
import { recurringPayments, payments, projects } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { toCents } from '$lib/utils/formatters';
import { currentMonth, nextMonth, monthBefore, dateForMonth } from '$lib/utils/months';
import { ApiError } from '$lib/server/errors';
import { verifyClientOwnership } from './client';
import { applyPaymentToProject } from './payment';
import type { CreateRecurringPaymentInput, UpdateRecurringPaymentInput } from '$lib/validations';

// ── CRUD ────────────────────────────────────────────────────────────────────

export async function listRecurringPayments(userId: string, clientId: string) {
	return db
		.select({
			id: recurringPayments.id,
			projectId: recurringPayments.projectId,
			projectTitle: projects.title,
			amount: recurringPayments.amount,
			note: recurringPayments.note,
			dayOfMonth: recurringPayments.dayOfMonth,
			active: recurringPayments.active,
			startMonth: recurringPayments.startMonth,
			lastGeneratedMonth: recurringPayments.lastGeneratedMonth
		})
		.from(recurringPayments)
		.innerJoin(projects, eq(recurringPayments.projectId, projects.id))
		.where(and(eq(recurringPayments.userId, userId), eq(recurringPayments.clientId, clientId)))
		.orderBy(asc(recurringPayments.createdAt));
}

export async function createRecurringPayment(userId: string, data: CreateRecurringPaymentInput) {
	const ownsClient = await verifyClientOwnership(userId, data.clientId);
	if (!ownsClient) throw new ApiError(404, 'Client not found');

	// The project must belong to the same client — generated payments land on it.
	const [project] = await db
		.select()
		.from(projects)
		.where(
			and(
				eq(projects.id, data.projectId),
				eq(projects.clientId, data.clientId),
				eq(projects.userId, userId)
			)
		);
	if (!project) throw new ApiError(404, 'Project not found');

	const [recurring] = await db
		.insert(recurringPayments)
		.values({
			clientId: data.clientId,
			projectId: data.projectId,
			userId,
			amount: toCents(data.amount),
			note: data.note,
			dayOfMonth: data.dayOfMonth,
			startMonth: data.startMonth ?? currentMonth()
		})
		.returning();

	// Generate any immediately-due months (e.g. startMonth in the past).
	await generateDueForRecurring(recurring);

	return recurring;
}

export async function updateRecurringPayment(
	userId: string,
	id: string,
	data: UpdateRecurringPaymentInput
) {
	const setFields: Partial<typeof recurringPayments.$inferInsert> = { updatedAt: new Date() };
	if (data.amount !== undefined) setFields.amount = toCents(data.amount);
	if (data.dayOfMonth !== undefined) setFields.dayOfMonth = data.dayOfMonth;
	if (data.note !== undefined) setFields.note = data.note;
	if (data.active !== undefined) setFields.active = data.active;

	const [updated] = await db
		.update(recurringPayments)
		.set(setFields)
		.where(and(eq(recurringPayments.id, id), eq(recurringPayments.userId, userId)))
		.returning();

	if (!updated) return null;

	// Reactivating catches up all months missed while paused.
	if (data.active === true) {
		await generateDueForRecurring(updated);
	}

	return updated;
}

export async function deleteRecurringPayment(userId: string, id: string) {
	const [deleted] = await db
		.delete(recurringPayments)
		.where(and(eq(recurringPayments.id, id), eq(recurringPayments.userId, userId)))
		.returning();
	return deleted ?? null;
}

// ── Lazy generation ─────────────────────────────────────────────────────────
// No cron: every protected page load calls generateDueRecurringPayments, which
// inserts real payment rows for any month between the last generated month
// (exclusive) and the current month (inclusive). Months are tracked as
// 'YYYY-MM' strings so generation is idempotent per month — a payment is
// never generated twice for the same month even under concurrent requests
// (worst case the second transaction inserts after the first commits, which
// requires both to have read the same stale lastGeneratedMonth).

async function generateDueForRecurring(recurring: typeof recurringPayments.$inferSelect) {
	const thisMonth = currentMonth();
	const firstDue = recurring.lastGeneratedMonth
		? nextMonth(recurring.lastGeneratedMonth)
		: recurring.startMonth;
	if (!monthBefore(firstDue, nextMonth(thisMonth))) return 0; // nothing due

	let generated = 0;

	await db.transaction(async (tx) => {
		// Re-read inside the transaction to shrink the stale-read window.
		const [current] = await tx
			.select()
			.from(recurringPayments)
			.where(eq(recurringPayments.id, recurring.id));
		if (!current || !current.active) return;

		let month = current.lastGeneratedMonth
			? nextMonth(current.lastGeneratedMonth)
			: current.startMonth;
		let lastGenerated: string | null = null;

		while (monthBefore(month, nextMonth(thisMonth))) {
			const [project] = await tx.select().from(projects).where(eq(projects.id, current.projectId));
			if (!project) break; // project deleted mid-flight; FK cascade handles cleanup

			await tx.insert(payments).values({
				projectId: current.projectId,
				amount: current.amount,
				date: dateForMonth(month, current.dayOfMonth),
				note: current.note || 'Recurring payment',
				userId: current.userId
			});
			await applyPaymentToProject(tx, project, current.amount);

			lastGenerated = month;
			generated++;
			month = nextMonth(month);
		}

		if (lastGenerated) {
			await tx
				.update(recurringPayments)
				.set({ lastGeneratedMonth: lastGenerated, updatedAt: new Date() })
				.where(eq(recurringPayments.id, current.id));
		}
	});

	return generated;
}

export async function generateDueRecurringPayments(userId: string) {
	const active = await db
		.select()
		.from(recurringPayments)
		.where(and(eq(recurringPayments.userId, userId), eq(recurringPayments.active, true)));

	let total = 0;
	for (const recurring of active) {
		total += await generateDueForRecurring(recurring);
	}
	return total;
}
