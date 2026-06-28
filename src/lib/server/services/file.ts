import { db } from '$lib/server/db';
import { files } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export async function listFilesByClient(userId: string, clientId: string) {
	return db
		.select()
		.from(files)
		.where(and(eq(files.clientId, clientId), eq(files.userId, userId)));
}

export async function listFilesByClients(userId: string, clientIds: string[]) {
	if (clientIds.length === 0) return [];
	return db
		.select()
		.from(files)
		.where(and(inArray(files.clientId, clientIds), eq(files.userId, userId)));
}

export async function createFile(
	userId: string,
	data: { clientId: string; storagePath: string; filename: string; fileType: string }
) {
	const [file] = await db
		.insert(files)
		.values({
			clientId: data.clientId,
			storagePath: data.storagePath,
			filename: data.filename,
			fileType: data.fileType,
			userId
		})
		.returning();
	return file;
}

export async function getFileById(userId: string, id: string) {
	const [file] = await db
		.select()
		.from(files)
		.where(and(eq(files.id, id), eq(files.userId, userId)));
	return file ?? null;
}

export async function deleteFileRecord(userId: string, id: string) {
	await db.delete(files).where(and(eq(files.id, id), eq(files.userId, userId)));
}
