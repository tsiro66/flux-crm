import { z } from 'zod/v4';

export const createConversationSchema = z.object({
	title: z.string().trim().min(1, 'Title is required').max(100, 'Title is too long')
});

export const updateConversationSchema = z.object({
	title: z.string().trim().min(1, 'Title is required').max(100, 'Title is too long')
});

// Role is a closed enum: callers may only persist user/assistant messages.
// Accepting arbitrary roles (e.g. "system") would let a client plant prompt-
// injection content that gets replayed to the agent later. Content is capped
// so a single row can't grow unbounded.
export const addMessageSchema = z.object({
	role: z.enum(['user', 'assistant']),
	content: z.string().trim().min(1, 'Content is required').max(10_000, 'Message is too long')
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type AddMessageInput = z.infer<typeof addMessageSchema>;
