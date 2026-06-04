import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { clients } from '$lib/server/db/schema';
import { updateClientSchema } from '$lib/validations';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const [client] = await db
		.select()
		.from(clients)
		.where(and(eq(clients.id, params.id), eq(clients.userId, locals.user.id)));

	if (!client) return json({ error: 'Not found' }, { status: 404 });

	return json(client);
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const parsed = updateClientSchema.safeParse(body);

	if (!parsed.success) {
		return json({ error: parsed.error.issues }, { status: 400 });
	}

	const [updated] = await db
		.update(clients)
		.set({
			name: parsed.data.name,
			email: parsed.data.email || null,
			phone: parsed.data.phone || null,
			notes: parsed.data.notes || null,
			updatedAt: new Date()
		})
		.where(and(eq(clients.id, params.id), eq(clients.userId, locals.user.id)))
		.returning();

	if (!updated) return json({ error: 'Not found' }, { status: 404 });

	return json(updated);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const [deleted] = await db
		.delete(clients)
		.where(and(eq(clients.id, params.id), eq(clients.userId, locals.user.id)))
		.returning();

	if (!deleted) return json({ error: 'Not found' }, { status: 404 });

	return json({ success: true });
};