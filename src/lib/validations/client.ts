import { z } from 'zod/v4';

export const createClientSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	email: z.string().email('Invalid email').or(z.literal('')),
	phone: z.string().optional().default(''),
	notes: z.string().optional().default('')
});

export const updateClientSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	email: z.string().email('Invalid email').or(z.literal('')),
	phone: z.string().optional().default(''),
	notes: z.string().optional().default('')
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
