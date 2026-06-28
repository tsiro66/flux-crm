import { z } from 'zod/v4';

export const importClientRowSchema = z.object({
	name: z.string().trim().min(1, 'Name is required'),
	email: z.string().trim().email('Invalid email').or(z.literal('')).optional().default(''),
	phone: z.string().trim().optional().default(''),
	notes: z.string().trim().optional().default('')
});

export const importProjectRowSchema = z
	.object({
		clientEmail: z.string().optional().default(''),
		clientName: z.string().optional().default(''),
		title: z.string().min(1, 'Title is required'),
		totalAmount: z.coerce.number().min(0, 'Amount must be positive').default(0),
		paidAmount: z.coerce.number().min(0, 'Amount must be positive').default(0),
		invoiceStatus: z.preprocess(
			(v) => {
				if (v === undefined || v === null || v === '') return 'for_invoice';
				return typeof v === 'string' ? v.trim().toLowerCase() : v;
			},
			z.enum(['for_invoice', 'invoiced', 'no_invoice'])
		),
		paymentStatus: z.preprocess(
			(v) => {
				if (v === undefined || v === null || v === '') return 'not_paid';
				return typeof v === 'string' ? v.trim().toLowerCase() : v;
			},
			z.enum(['not_paid', 'partial_payment', 'paid'])
		),
		date: z.string().optional().default('')
	})
	.refine((data) => data.clientEmail.trim() || data.clientName.trim(), {
		message: 'clientEmail or clientName is required',
		path: ['clientEmail']
	});

export type ImportClientRowInput = z.infer<typeof importClientRowSchema>;
export type ImportProjectRowInput = z.infer<typeof importProjectRowSchema>;
