import { z } from 'zod/v4';

const clientBaseSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	email: z.string().email('Invalid email').or(z.literal('')),
	phone: z.string().optional().default(''),
	notes: z.string().optional().default('')
});

export const createClientSchema = clientBaseSchema;
export const updateClientSchema = clientBaseSchema;

export const patchClientSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	email: z.string().email('Invalid email').or(z.literal('')).optional(),
	phone: z.string().optional(),
	notes: z.string().optional()
});

export const bulkDeleteClientsSchema = z.object({
	ids: z.array(z.string().uuid('Invalid client ID')).min(1, 'At least one id is required').max(500, 'Too many ids')
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type PatchClientInput = z.infer<typeof patchClientSchema>;
export type BulkDeleteClientsInput = z.infer<typeof bulkDeleteClientsSchema>;
