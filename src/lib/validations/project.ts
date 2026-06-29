import { z } from 'zod/v4';

export const createProjectSchema = z.object({
	clientId: z.string().uuid('Invalid client ID'),
	title: z.string().min(1, 'Title is required'),
	totalAmount: z.coerce.number().min(0, 'Amount must be positive').default(0),
	invoiceStatus: z.enum(['for_invoice', 'invoiced', 'no_invoice']).default('for_invoice'),
	paymentStatus: z.enum(['not_paid', 'partial_payment', 'paid']).default('not_paid'),
	date: z.string().optional().default('')
});

export const updateProjectSchema = z
	.object({
		title: z.string().min(1, 'Title is required').optional(),
		totalAmount: z.coerce.number().min(0, 'Amount must be positive').optional(),
		invoiceStatus: z.enum(['for_invoice', 'invoiced', 'no_invoice']).optional(),
		paymentStatus: z.enum(['not_paid', 'partial_payment', 'paid']).optional(),
		date: z.string().optional()
	})
	.refine((data) => Object.values(data).some((v) => v !== undefined), {
		message: 'At least one field is required'
	});

export const bulkDeleteProjectsSchema = z.object({
	ids: z.array(z.string().uuid('Invalid project ID')).min(1, 'At least one id is required').max(500, 'Too many ids')
});

export const updateProjectStatusSchema = z
	.object({
		invoiceStatus: z.enum(['for_invoice', 'invoiced', 'no_invoice']).optional(),
		paymentStatus: z.enum(['not_paid', 'partial_payment', 'paid']).optional()
	})
	.refine((data) => data.invoiceStatus || data.paymentStatus, {
		message: 'At least one status is required'
	});

export type BulkDeleteProjectsInput = z.infer<typeof bulkDeleteProjectsSchema>;

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type UpdateProjectStatusInput = z.infer<typeof updateProjectStatusSchema>;
