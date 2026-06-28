import { db } from '$lib/server/db';
import { clients } from '$lib/server/db/schema';
import { escapeLike, likePattern } from '$lib/server/db/like';
import { eq, and, ilike, or, inArray } from 'drizzle-orm';
import { listFilesByClient, listFilesByClients } from './file';
import { deleteStorageFile } from './storage';
import type { z } from 'zod/v4';
import type {
	createClientSchema,
	updateClientSchema,
	patchClientSchema,
	ImportClientRowInput
} from '$lib/validations';

export async function listClients(userId: string, search?: string) {
	if (search) {
		const pattern = likePattern(search);
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

// Find a client by name (case-insensitive) within a tenant. Used as the dedup
// key for imports when a row has no email — otherwise every blank-email row
// would create a duplicate client even if one with the same name already exists.
export async function findClientByName(userId: string, name: string) {
	const trimmed = name.trim();
	if (!trimmed) return null;
	const [client] = await db
		.select()
		.from(clients)
		.where(and(eq(clients.userId, userId), ilike(clients.name, escapeLike(trimmed))))
		.limit(1);
	return client ?? null;
}

export async function upsertClientFromImport(
	userId: string,
	data: ImportClientRowInput
): Promise<{ action: 'created' | 'updated'; client: typeof clients.$inferSelect }> {
	// Dedup by email when present, otherwise by name (case-insensitive). This
	// prevents blank-email rows from always creating duplicates.
	const existing =
		(await findClientByEmail(userId, data.email)) ?? (await findClientByName(userId, data.name));
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
	// Delete the actual storage objects before the rows vanish (the files rows
	// cascade-delete with the client, but the Supabase Storage blobs would leak).
	const clientFiles = await listFilesByClient(userId, id);
	await Promise.all(
		clientFiles.map((f) => deleteStorageFile(f.storagePath).catch(() => undefined))
	);

	const [deleted] = await db
		.delete(clients)
		.where(and(eq(clients.id, id), eq(clients.userId, userId)))
		.returning();
	return deleted ?? null;
}

export async function deleteClients(userId: string, ids: string[]) {
	const uniqueIds = [...new Set(ids.filter(Boolean))];
	if (uniqueIds.length === 0) return [];

	// Clean up storage blobs first (same rationale as deleteClient). The files
	// rows cascade-delete with the clients, but Supabase Storage objects don't.
	const clientFiles = await listFilesByClients(userId, uniqueIds);
	await Promise.all(
		clientFiles.map((f) => deleteStorageFile(f.storagePath).catch(() => undefined))
	);

	// Scope the delete to the caller so a forged id list can't touch another
	// tenant's rows. inArray + userId filter = belt-and-suspenders.
	const deleted = await db
		.delete(clients)
		.where(and(inArray(clients.id, uniqueIds), eq(clients.userId, userId)))
		.returning({ id: clients.id });
	return deleted.map((r) => r.id);
}
