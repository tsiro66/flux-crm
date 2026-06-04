import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { clients } from '$lib/server/db/schema';
import { createClientSchema } from '$lib/validations';
import { eq, and, ilike, or } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const search = url.searchParams.get('search') || '';

	const result = await db
		.select()
		.from(clients)
		.where(
			and(
				eq(clients.userId, locals.user.id),
				search
					? or(ilike(clients.name, `%${search}%`), ilike(clients.email, `%${search}%`))
					: undefined!
			)
		)
		.orderBy(clients.createdAt);

	return json(result);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const parsed = createClientSchema.safeParse(body);

	if (!parsed.success) {
		return json({ error: parsed.error.issues }, { status: 400 });
	}

	const [client] = await db
		.insert(clients)
		.values({
			name: parsed.data.name,
			email: parsed.data.email || null,
			phone: parsed.data.phone || null,
			notes: parsed.data.notes || null,
			userId: locals.user.id
		})
		.returning();

	return json(client, { status: 201 });
};