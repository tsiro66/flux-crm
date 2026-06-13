import { db } from '$lib/server/db';
import { clients } from '$lib/server/db/schema';
import { eq, and, ilike, or } from 'drizzle-orm';
import type { z } from 'zod';
import type { createClientSchema, updateClientSchema } from '$lib/validations';

export async function listClients(userId: string, search?: string) {
	return db
		.select()
		.from(clients)
		.where(
			and(
				eq(clients.userId, userId),
				search
					? or(ilike(clients.name, `%${search}%`), ilike(clients.email, `%${search}%`))
					: undefined!
			)
		)
		.orderBy(clients.createdAt);
}

export async function getClientById(userId: string, id: string) {
	const [client] = await db
		.select()
		.from(clients)
		.where(and(eq(clients.id, id), eq(clients.userId, userId)));
	return client ?? null;
}

export async function createClient(userId: string, data: z.infer<typeof createClientSchema>) {
	const [client] = await db
		.insert(clients)
		.values({
			name: data.name,
			email: data.email || null,
			phone: data.phone || null,
			notes: data.notes || null,
			userId
		})
		.returning();
	return client;
}

export async function updateClient(
	userId: string,
	id: string,
	data: z.infer<typeof updateClientSchema>
) {
	const [updated] = await db
		.update(clients)
		.set({
			name: data.name,
			email: data.email || null,
			phone: data.phone || null,
			notes: data.notes || null,
			updatedAt: new Date()
		})
		.where(and(eq(clients.id, id), eq(clients.userId, userId)))
		.returning();
	return updated ?? null;
}

export async function deleteClient(userId: string, id: string) {
	const [deleted] = await db
		.delete(clients)
		.where(and(eq(clients.id, id), eq(clients.userId, userId)))
		.returning();
	return deleted ?? null;
}
