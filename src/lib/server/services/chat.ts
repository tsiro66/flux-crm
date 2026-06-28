import { db } from '$lib/server/db';
import { chatConversations, chatMessages } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function getConversationById(userId: string, id: string) {
	const [conversation] = await db
		.select()
		.from(chatConversations)
		.where(and(eq(chatConversations.id, id), eq(chatConversations.userId, userId)));
	return conversation ?? null;
}

export async function listConversations(userId: string) {
	return db
		.select()
		.from(chatConversations)
		.where(eq(chatConversations.userId, userId))
		.orderBy(desc(chatConversations.updatedAt));
}

export async function createConversation(userId: string, title = 'New Chat') {
	const [conversation] = await db.insert(chatConversations).values({ userId, title }).returning();
	return conversation;
}

export async function getMessages(userId: string, conversationId: string) {
	return db
		.select()
		.from(chatMessages)
		.where(and(eq(chatMessages.conversationId, conversationId), eq(chatMessages.userId, userId)))
		.orderBy(chatMessages.createdAt);
}

export async function addMessage(
	userId: string,
	conversationId: string,
	data: { role: string; content: string }
) {
	const [message] = await db
		.insert(chatMessages)
		.values({
			conversationId,
			userId,
			role: data.role,
			content: data.content
		})
		.returning();

	await db
		.update(chatConversations)
		.set({ updatedAt: new Date() })
		.where(and(eq(chatConversations.id, conversationId), eq(chatConversations.userId, userId)));

	return message;
}

export async function updateConversation(userId: string, id: string, title: string) {
	const [updated] = await db
		.update(chatConversations)
		.set({ title, updatedAt: new Date() })
		.where(and(eq(chatConversations.id, id), eq(chatConversations.userId, userId)))
		.returning();
	return updated ?? null;
}

export async function deleteConversation(userId: string, id: string) {
	// chatMessages cascade-delete with the conversation, so we only need to remove
	// the conversation row (scoped to the caller).
	await db
		.delete(chatConversations)
		.where(and(eq(chatConversations.id, id), eq(chatConversations.userId, userId)));
}
