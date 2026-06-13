import { z } from 'zod/v4';

export const createPaymentSchema = z.object({
	amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
	date: z.string().min(1, 'Date is required'),
	note: z.string().optional().default('')
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
