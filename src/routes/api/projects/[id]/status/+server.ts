import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();

	if (!body.invoiceStatus && !body.paymentStatus) {
		return json({ error: 'No status provided' }, { status: 400 });
	}

	const updateData: Record<string, string> = {};
	if (body.invoiceStatus) updateData.invoiceStatus = body.invoiceStatus;
	if (body.paymentStatus) updateData.paymentStatus = body.paymentStatus;

	const [updated] = await db
		.update(projects)
		.set({ ...updateData, updatedAt: new Date() })
		.where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
		.returning();

	if (!updated) return json({ error: 'Not found' }, { status: 404 });

	return json(updated);
};