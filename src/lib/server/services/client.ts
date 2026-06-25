import { db } from '$lib/server/db';
import { clients } from '$lib/server/db/schema';
import { eq, and, ilike, or } from 'drizzle-orm';
import type { z } from 'zod/v4';
import type {
	createClientSchema,
	updateClientSchema,
	patchClientSchema,
	ImportClientRowInput
} from '$lib/validations';

function escapeLike(str: string): string {
	return str.replace(/[%_\\]/g, '\\$&');
}

export async function listClients(userId: string, search?: string) {
	if (search) {
		const pattern = `%${escapeLike(search)}%`;
		return db
			.select()
			.from(clients)
			.where(
				and(
					eq(clients.userId, userId),
					or(ilike(clients.name, pattern), ilike(clients.email, pattern))
				)
			)
			.orderBy(clients.createdAt);
	}
	return db.select().from(clients).where(eq(clients.userId, userId)).orderBy(clients.createdAt);
}

export async function getClientById(userId: string, id: string) {
	const [client] = await db
		.select()
		.from(clients)
		.where(and(eq(clients.id, id), eq(clients.userId, userId)));
	return client ?? null;
}

export async function listAllClients(userId: string) {
	return db.select().from(clients).where(eq(clients.userId, userId)).orderBy(clients.createdAt);
}

export async function findClientByEmail(userId: string, email: string) {
	if (!email.trim()) return null;
	const [client] = await db
		.select()
		.from(clients)
		.where(and(eq(clients.userId, userId), eq(clients.email, email.trim())))
		.limit(1);
	return client ?? null;
}

export async function upsertClientFromImport(
	userId: string,
	data: ImportClientRowInput
): Promise<{ action: 'created' | 'updated'; client: typeof clients.$inferSelect }> {
	const existing = await findClientByEmail(userId, data.email);
	if (existing) {
		const [updated] = await db
			.update(clients)
			.set({
				name: data.name,
				phone: data.phone || null,
				notes: data.notes || null,
				updatedAt: new Date()
			})
			.where(and(eq(clients.id, existing.id), eq(clients.userId, userId)))
			.returning();
		return { action: 'updated', client: updated ?? existing };
	}

	const [created] = await db
		.insert(clients)
		.values({
			name: data.name,
			email: data.email || null,
			phone: data.phone || null,
			notes: data.notes || null,
			userId
		})
		.returning();
	return { action: 'created', client: created };
}

export async function verifyClientOwnership(userId: string, clientId: string): Promise<boolean> {
	const client = await getClientById(userId, clientId);
	return client !== null;
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

export async function patchClient(
	userId: string,
	id: string,
	data: z.infer<typeof patchClientSchema>
) {
	const existing = await getClientById(userId, id);
	if (!existing) return null;

	const updated = {
		name: data.name ?? existing.name,
		email: data.email ?? existing.email,
		phone: data.phone ?? existing.phone,
		notes: data.notes ?? existing.notes,
		updatedAt: new Date()
	};

	const [result] = await db
		.update(clients)
		.set(updated)
		.where(and(eq(clients.id, id), eq(clients.userId, userId)))
		.returning();
	return result ?? null;
}

export async function deleteClient(userId: string, id: string) {
	const [deleted] = await db
		.delete(clients)
		.where(and(eq(clients.id, id), eq(clients.userId, userId)))
		.returning();
	return deleted ?? null;
}
