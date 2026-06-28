import { z } from 'zod/v4';

export const createConversationSchema = z.object({
	title: z.string().trim().min(1, 'Title is required').max(100, 'Title is too long')
});

export const updateConversationSchema = z.object({
	title: z.string().trim().min(1, 'Title is required').max(100, 'Title is too long')
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
