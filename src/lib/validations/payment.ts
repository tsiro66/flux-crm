import { z } from 'zod/v4';

export const createPaymentSchema = z.object({
	projectId: z.string().uuid('Invalid project ID'),
	amount: z.coerce.number().positive('Amount must be greater than 0'),
	date: z.string().min(1, 'Date is required'),
	note: z.string().optional().default('')
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const updatePaymentSchema = z.object({
	amount: z.coerce.number().positive('Amount must be greater than 0'),
	date: z.string().min(1, 'Date is required'),
	note: z.string().optional().default('')
});

export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
