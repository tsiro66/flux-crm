import { z } from 'zod/v4';

export const createProjectSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	totalAmount: z.coerce.number().min(0, 'Amount must be positive').default(0),
	invoiceStatus: z.enum(['for_invoice', 'invoiced', 'no_invoice']).default('for_invoice'),
	paymentStatus: z.enum(['not_paid', 'partial_payment', 'paid']).default('not_paid'),
	date: z.string().optional().default('')
});

export const updateProjectSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	totalAmount: z.coerce.number().min(0, 'Amount must be positive').default(0),
	invoiceStatus: z.enum(['for_invoice', 'invoiced', 'no_invoice']),
	paymentStatus: z.enum(['not_paid', 'partial_payment', 'paid']),
	date: z.string().optional().default('')
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
